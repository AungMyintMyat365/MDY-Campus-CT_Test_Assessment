import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase, supabaseConfigError } from "../lib/supabaseClient";

export default function LeadClassesPage() {
  const [classes, setClasses] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [coders, setCoders] = useState([]);
  const [name, setName] = useState("");
  const [coachId, setCoachId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("Saturday");
  const [startTime, setStartTime] = useState("10:00");
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (!supabase) {
      setError(supabaseConfigError || "Supabase client is not configured");
      return;
    }

    setLoading(true);
    setError("");

    const [classesRes, coachesRes, codersRes] = await Promise.all([
      supabase
        .from("classes")
        .select("id, name, day_of_week, start_time, duration_minutes, profiles!classes_coach_id_fkey(full_name, nickname)")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, nickname").eq("role", "coach").eq("is_active", true).order("full_name"),
      supabase
        .from("class_enrollments")
        .select(
          "id, status, joined_at, left_at, profiles!class_enrollments_coder_id_fkey(full_name, nickname, coder_id), classes!class_enrollments_class_id_fkey(name)"
        )
        .order("joined_at", { ascending: false }),
    ]);

    if (classesRes.error) {
      setError(classesRes.error.message);
      setLoading(false);
      return;
    }
    if (coachesRes.error) {
      setError(coachesRes.error.message);
      setLoading(false);
      return;
    }
    if (codersRes.error) {
      setError(codersRes.error.message);
      setLoading(false);
      return;
    }

    const nextClasses = classesRes.data ?? [];
    const nextCoaches = coachesRes.data ?? [];
    const nextCoders = codersRes.data ?? [];
    setClasses(nextClasses);
    setCoaches(nextCoaches);
    setCoders(nextCoders);
    if (!coachId && nextCoaches.length) setCoachId(nextCoaches[0].id);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    if (!supabase) {
      setError(supabaseConfigError || "Supabase client is not configured");
      setSaving(false);
      return;
    }

    if (!coachId) {
      setError("Select a coach before creating class.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("classes").insert({
      name,
      coach_id: coachId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      duration_minutes: Number(durationMinutes) || 90,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setMessage("Class created.");
    setName("");
    setDurationMinutes(90);
    await loadData();
    setSaving(false);
  }

  return (
    <main className="container">
      <h1>Manage Classes</h1>
      <div className="row gap">
        <Link to="/lead/dashboard">Dashboard</Link>
        <Link to="/lead/coaches">Coaches</Link>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <h2>Create Class</h2>
        <label>Class Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
        <label>Coach</label>
        <select value={coachId} onChange={(e) => setCoachId(e.target.value)} required>
          <option value="" disabled>
            Select coach
          </option>
          {coaches.map((coach) => (
            <option key={coach.id} value={coach.id}>
              {coach.nickname ? `${coach.nickname} (${coach.full_name})` : coach.full_name}
            </option>
          ))}
        </select>
        <label>Day</label>
        <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} required>
          <option>Saturday</option>
          <option>Sunday</option>
          <option>Wednesday</option>
          <option>Thursday</option>
          <option>Friday</option>
        </select>
        <label>Start Time</label>
        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
        <label>Duration Minutes</label>
        <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} min={30} required />
        <button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Class"}</button>
      </form>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {loading ? <p>Loading classes...</p> : null}

      <section className="card">
        <h2>Class List</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Coach</th>
              <th>Day</th>
              <th>Time</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((cls) => (
              <tr key={cls.id}>
                <td>{cls.name}</td>
                <td>{cls.profiles?.nickname ?? cls.profiles?.full_name ?? "-"}</td>
                <td>{cls.day_of_week}</td>
                <td>{cls.start_time}</td>
                <td>{cls.duration_minutes} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Coder List</h2>
        <table>
          <thead>
            <tr>
              <th>Coder</th>
              <th>Coder ID</th>
              <th>Class</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {coders.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.profiles?.full_name}
                  {row.profiles?.nickname ? ` @ ${row.profiles.nickname}` : ""}
                </td>
                <td>{row.profiles?.coder_id ?? "-"}</td>
                <td>{row.classes?.name ?? "-"}</td>
                <td>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
