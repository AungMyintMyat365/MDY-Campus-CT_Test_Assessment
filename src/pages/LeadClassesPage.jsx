import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function LeadClassesPage() {
  const [classes, setClasses] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [name, setName] = useState("");
  const [coachId, setCoachId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("Saturday");
  const [startTime, setStartTime] = useState("10:00");
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [csvText, setCsvText] = useState("full_name,nickname,coder_id,class_id,temp_password");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [classesRes, coachesRes] = await Promise.all([
      supabase
        .from("classes")
        .select("id, name, day_of_week, start_time, duration_minutes, profiles!classes_coach_id_fkey(full_name, nickname)")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, nickname").eq("role", "coach").eq("is_active", true).order("full_name"),
    ]);

    if (classesRes.error) {
      setError(classesRes.error.message);
      return;
    }
    if (coachesRes.error) {
      setError(coachesRes.error.message);
      return;
    }

    setClasses(classesRes.data ?? []);
    setCoaches(coachesRes.data ?? []);
    if (!coachId && coachesRes.data?.length) setCoachId(coachesRes.data[0].id);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    const { error: insertError } = await supabase.from("classes").insert({
      name,
      coach_id: coachId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      duration_minutes: Number(durationMinutes) || 90,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setMessage("Class created.");
    setName("");
    setDurationMinutes(90);
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
          <option value="" disabled>Select coach</option>
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
        <button type="submit">Create Class</button>
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
    </main>
  );
}
