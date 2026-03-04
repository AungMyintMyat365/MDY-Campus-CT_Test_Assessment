import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { coderDisplayName, profileDisplayName } from "../lib/displayName";
import { supabase, supabaseConfigError } from "../lib/supabaseClient";

export default function CoachCodersPage() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [coders, setCoders] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [coderId, setCoderId] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [classId, setClassId] = useState("");
  const [creating, setCreating] = useState(false);

  const [movingCoderId, setMovingCoderId] = useState("");
  const [toClassId, setToClassId] = useState("");
  const [reason, setReason] = useState("");
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadData();
    }
  }, [profile?.id]);

  async function loadData() {
    if (!supabase) {
      setError(supabaseConfigError || "Supabase client is not configured");
      return;
    }
    if (!profile?.id) {
      setError("Profile is not loaded yet. Please wait and retry.");
      return;
    }

    setLoading(true);
    setError("");

    const [classesRes, allClassesRes, codersRes] = await Promise.all([
      supabase.from("classes").select("id, name, day_of_week, start_time").eq("coach_id", profile.id).order("day_of_week"),
      supabase.from("classes").select("id, name").order("name"),
      supabase
        .from("class_enrollments")
        .select("coder_id, class_id, profiles!class_enrollments_coder_id_fkey(full_name, nickname, coder_id), classes!class_enrollments_class_id_fkey(name)")
        .eq("status", "active"),
    ]);

    if (classesRes.error || allClassesRes.error || codersRes.error) {
      setError(classesRes.error?.message || allClassesRes.error?.message || codersRes.error?.message || "Failed to load coder data");
      setLoading(false);
      return;
    }

    const coachClasses = classesRes.data ?? [];
    const coachClassIds = coachClasses.map((cls) => cls.id);
    const activeCoders = (codersRes.data ?? []).filter((row) => coachClassIds.includes(row.class_id));
    const schoolClasses = allClassesRes.data ?? [];

    setClasses(coachClasses);
    setAllClasses(schoolClasses);
    setCoders(activeCoders);

    if (!classId && coachClasses.length) setClassId(coachClasses[0].id);
    if (!toClassId && schoolClasses.length) setToClassId(schoolClasses[0].id);
    if (!movingCoderId && activeCoders.length) setMovingCoderId(activeCoders[0].coder_id);

    setLoading(false);
  }

  async function handleCreateCoder(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setCreating(true);

    if (!supabase) {
      setError(supabaseConfigError || "Supabase client is not configured");
      setCreating(false);
      return;
    }

    const { data, error: invokeError } = await supabase.functions.invoke("create-coder-account", {
      body: {
        coder_id: coderId,
        full_name: fullName,
        nickname,
        class_id: classId,
        temp_password: tempPassword,
      },
    });

    if (invokeError) {
      setError(invokeError.message || "Failed to create coder");
      setCreating(false);
      return;
    }
    if (data?.error) {
      setError(data.error);
      setCreating(false);
      return;
    }

    setFullName("");
    setNickname("");
    setCoderId("");
    setTempPassword("");
    setMessage("Coder account created.");
    await loadData();
    setCreating(false);
  }

  async function handleMoveCoder(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setMoving(true);

    if (!supabase) {
      setError(supabaseConfigError || "Supabase client is not configured");
      setMoving(false);
      return;
    }

    const { data, error: invokeError } = await supabase.functions.invoke("move-coder-class", {
      body: {
        coder_profile_id: movingCoderId,
        to_class_id: toClassId,
        reason,
      },
    });

    if (invokeError) {
      setError(invokeError.message || "Failed to move coder");
      setMoving(false);
      return;
    }
    if (data?.error) {
      setError(data.error);
      setMoving(false);
      return;
    }

    setReason("");
    setMessage("Coder moved.");
    await loadData();
    setMoving(false);
  }

  return (
    <main className="container">
      <h1>Manage Coders</h1>
      <p>Signed in as {profileDisplayName(profile)}.</p>
      <div className="row gap">
        <Link to="/coach/dashboard">Dashboard</Link>
      </div>

      <form className="card" onSubmit={handleCreateCoder}>
        <h2>Create Coder Account</h2>
        <label>Full Name</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <label>Nickname</label>
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} required />
        <label>Coder ID</label>
        <input value={coderId} onChange={(e) => setCoderId(e.target.value)} required />
        <label>Temporary Password</label>
        <input type="password" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} minLength={8} required />
        <label>Class</label>
        <select value={classId} onChange={(e) => setClassId(e.target.value)} required>
          <option value="" disabled>
            Select class
          </option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
        <button type="submit" disabled={creating}>{creating ? "Creating..." : "Create Coder"}</button>
      </form>

      <form className="card" onSubmit={handleMoveCoder}>
        <h2>Move Coder</h2>
        <label>Coder</label>
        <select value={movingCoderId} onChange={(e) => setMovingCoderId(e.target.value)} required>
          <option value="" disabled>
            Select coder
          </option>
          {coders.map((row) => (
            <option key={row.coder_id} value={row.coder_id}>
              {coderDisplayName(row.profiles)} ({row.profiles?.coder_id}) - {row.classes?.name}
            </option>
          ))}
        </select>
        <label>To Class (all school classes)</label>
        <select value={toClassId} onChange={(e) => setToClassId(e.target.value)} required>
          <option value="" disabled>
            Select destination class
          </option>
          {allClasses.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
        <label>Reason</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} />
        <button type="submit" disabled={moving}>{moving ? "Moving..." : "Move Coder"}</button>
      </form>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {loading ? <p>Loading coders...</p> : null}

      <section className="card">
        <h2>Active Coders In Your Classes</h2>
        <table>
          <thead>
            <tr>
              <th>Coder</th>
              <th>Coder ID</th>
              <th>Current Class</th>
            </tr>
          </thead>
          <tbody>
            {coders.map((row) => (
              <tr key={row.coder_id}>
                <td>{coderDisplayName(row.profiles)}</td>
                <td>{row.profiles?.coder_id}</td>
                <td>{row.classes?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
