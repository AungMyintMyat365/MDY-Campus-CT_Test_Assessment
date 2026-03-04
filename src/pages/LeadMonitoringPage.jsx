import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { profileDisplayName } from "../lib/displayName";
import { supabase, supabaseConfigError } from "../lib/supabaseClient";

function formatRatio(done, total) {
  if (!total) return "0%";
  return `${Math.round((done / total) * 100)}%`;
}

export default function LeadMonitoringPage() {
  const { profile } = useAuth();
  const [results, setResults] = useState([]);
  const [classes, setClasses] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [error, setError] = useState("");

  const [classFilter, setClassFilter] = useState("all");
  const [coachFilter, setCoachFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (!supabase) {
      setError(supabaseConfigError || "Supabase client is not configured");
      return;
    }

    const [resultsRes, classesRes, coachesRes] = await Promise.all([
      supabase
        .from("assessment_results")
        .select(
          "id, status, submitted_at, graded_at, assessment_assignments(class_id, assessment_id, classes(name, coach_id), assessments(title))"
        )
        .order("submitted_at", { ascending: false, nullsFirst: false })
        .limit(300),
      supabase.from("classes").select("id, name, coach_id").order("name"),
      supabase.from("profiles").select("id, full_name, nickname").eq("role", "coach").order("full_name"),
    ]);

    if (resultsRes.error || classesRes.error || coachesRes.error) {
      setError(resultsRes.error?.message || classesRes.error?.message || coachesRes.error?.message || "Failed to load monitoring data");
      return;
    }

    setResults(resultsRes.data ?? []);
    setClasses(classesRes.data ?? []);
    setCoaches(coachesRes.data ?? []);
  }

  const filteredRows = useMemo(() => {
    return results.filter((row) => {
      const classId = row.assessment_assignments?.class_id;
      const coachId = row.assessment_assignments?.classes?.coach_id;
      if (classFilter !== "all" && classId !== classFilter) return false;
      if (coachFilter !== "all" && coachId !== coachFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      return true;
    });
  }, [results, classFilter, coachFilter, statusFilter]);

  const summary = useMemo(() => {
    const total = filteredRows.length;
    const submitted = filteredRows.filter((row) => row.status === "submitted").length;
    const graded = filteredRows.filter((row) => row.status === "graded").length;
    const pending = filteredRows.filter((row) => row.status === "pending").length;
    return { total, submitted, graded, pending };
  }, [filteredRows]);

  return (
    <main className="container">
      <h1>Lead Monitoring</h1>
      <p>Signed in as {profileDisplayName(profile)}.</p>

      <div className="row gap">
        <Link to="/lead/dashboard">Dashboard</Link>
        <Link to="/assessments">Assessments</Link>
        <Link to="/results">Results</Link>
      </div>

      <section className="card">
        <h2>Filters</h2>
        <label>Coach</label>
        <select value={coachFilter} onChange={(e) => setCoachFilter(e.target.value)}>
          <option value="all">All coaches</option>
          {coaches.map((coach) => (
            <option key={coach.id} value={coach.id}>
              {coach.full_name}
              {coach.nickname ? ` @ ${coach.nickname}` : ""}
            </option>
          ))}
        </select>

        <label>Class</label>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="all">All classes</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <label>Status</label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="submitted">Submitted</option>
          <option value="graded">Graded</option>
        </select>
      </section>

      <section className="card">
        <h2>Summary</h2>
        <p>Total rows: {summary.total}</p>
        <p>Pending: {summary.pending}</p>
        <p>Submitted: {summary.submitted}</p>
        <p>Graded: {summary.graded}</p>
        <p>Completion rate (graded): {formatRatio(summary.graded, summary.total)}</p>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="card">
        <h2>Latest Rows</h2>
        <table>
          <thead>
            <tr>
              <th>Assessment</th>
              <th>Class</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Graded</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id}>
                <td>{row.assessment_assignments?.assessments?.title ?? "-"}</td>
                <td>{row.assessment_assignments?.classes?.name ?? "-"}</td>
                <td>{row.status}</td>
                <td>{row.submitted_at ? new Date(row.submitted_at).toLocaleString() : "-"}</td>
                <td>{row.graded_at ? new Date(row.graded_at).toLocaleString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
