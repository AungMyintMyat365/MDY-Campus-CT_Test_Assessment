import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { coderDisplayName, profileDisplayName } from "../lib/displayName";
import { supabase } from "../lib/supabaseClient";

export default function CoachCodersPage() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [coders, setCoders] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [csvText, setCsvText] = useState("full_name,nickname,coder_id,class_id,temp_password");

  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [coderId, setCoderId] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [classId, setClassId] = useState("");

  const [movingCoderId, setMovingCoderId] = useState("");
  const [toClassId, setToClassId] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const classesRes = await supabase
      .from("classes")
      .select("id, name, day_of_week, start_time")
      .eq("coach_id", profile?.id)
      .order("day_of_week");

    if (classesRes.error) {
      setError(classesRes.error.message);
      return;
    }
    const coachClasses = classesRes.data ?? [];
    const coachIds = coachClasses.map((cls) => cls.id);
    setClasses(coachClasses);
    if (!classId && coachClasses.length) setClassId(coachClasses[0].id);

    const allClassesRes = await supabase.from("classes").select("id, name").order("name");
    if (allClassesRes.error) {
      setError(allClassesRes.error.message);
      return;
    }
    setAllClasses(allClassesRes.data ?? []);
    if (!toClassId && allClassesRes.data?.length) setToClassId(allClassesRes.data[0].id);

    const codersRes = await supabase
      .from("class_enrollments")
      .select("coder_id, class_id, profiles!class_enrollments_coder_id_fkey(full_name, nickname, coder_id), classes!class_enrollments_class_id_fkey(name)")
      .eq("status", "active");
    if (codersRes.error) {
      setError(codersRes.error.message);
      return;
    }

    const ownCoders = (codersRes.data ?? []).filter((row) => coachIds.includes(row.class_id));
    setCoders(ownCoders);
    if (!movingCoderId && ownCoders.length) setMovingCoderId(ownCoders[0].coder_id);
  }

  async function handleCreateCoder(e) {
    e.preventDefault();
    setError("");
    setMessage("");

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
      setError(invokeError.message);
      return;
    }
    if (data?.error) {
      setError(data.error);
      return;
    }

    setFullName("");
    setNickname("");
    setCoderId("");
    setTempPassword("");
    setMessage("Coder account created.");
    loadData();
  }

  async function handleMoveCoder(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    const { data, error: invokeError } = await supabase.functions.invoke("move-coder-class", {
      body: {
        coder_profile_id: movingCoderId,
        to_class_id: toClassId,
        reason,
      },
    });

    if (invokeError) {
      setError(invokeError.message);
      return;
    }
    if (data?.error) {
      setError(data.error);
      return;
    }

    setReason("");
    setMessage("Coder moved.");
    loadData();
  }

  async function handleImportCoders(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setImporting(true);

    const { data, error: invokeError } = await supabase.functions.invoke("import-coders-csv", {
      body: { csv: csvText },
    });

    setImporting(false);
    if (invokeError) {
      setError(invokeError.message);
      return;
    }
    if (data?.error) {
      setError(data.error);
      return;
    }

    setMessage(`Import done. Success: ${data.success_count}, Failed: ${data.failure_count}`);
    loadData();
  }

  async function handleCsvFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
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
          <option value="" disabled>Select class</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
        <button type="submit">Create Coder</button>
      </form>

      <form className="card" onSubmit={handleMoveCoder}>
        <h2>Move Coder</h2>
        <label>Coder</label>
        <select value={movingCoderId} onChange={(e) => setMovingCoderId(e.target.value)} required>
          <option value="" disabled>Select coder</option>
          {coders.map((row) => (
            <option key={row.coder_id} value={row.coder_id}>
              {coderDisplayName(row.profiles)} ({row.profiles?.coder_id}) - {row.classes?.name}
            </option>
          ))}
        </select>
        <label>To Class (all school classes)</label>
        <select value={toClassId} onChange={(e) => setToClassId(e.target.value)} required>
          <option value="" disabled>Select destination class</option>
          {allClasses.map((cls) => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
        <label>Reason</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} />
        <button type="submit">Move Coder</button>
      </form>

      <form className="card" onSubmit={handleImportCoders}>
        <h2>Import Coders CSV</h2>
        <label>Upload CSV File</label>
        <input type="file" accept=".csv,text/csv" onChange={handleCsvFile} />
        <label>Or Paste CSV</label>
        <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={8} />
        <button type="submit" disabled={importing}>{importing ? "Importing..." : "Import Coders"}</button>
      </form>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

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
