import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { coderDisplayName, profileDisplayName } from "../lib/displayName";
import { supabase, supabaseConfigError } from "../lib/supabaseClient";

function buildResultKey(assignmentId, coderId) {
  return `${assignmentId}:${coderId}`;
}

export default function ResultsPage() {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [status, setStatus] = useState("submitted");

  useEffect(() => {
    loadData();
  }, [profile?.id, profile?.role]);

  async function loadData() {
    if (!supabase) {
      setError(supabaseConfigError || "Supabase client is not configured");
      return;
    }

    setError("");
    setMessage("");

    const assignmentsQuery = supabase
      .from("assessment_assignments")
      .select(
        "id, coder_id, due_at, assigned_at, assessments(title), classes(name), profiles!assessment_assignments_coder_id_fkey(full_name, nickname, coder_id)"
      )
      .order("assigned_at", { ascending: false })
      .limit(100);

    const resultsQuery =
      profile?.role === "coder"
        ? supabase
            .from("assessment_results")
            .select(
              "id, assignment_id, coder_id, status, score, max_score, submitted_at, graded_at, assessment_assignments(assessments(title), classes(name))"
            )
            .eq("coder_id", profile.id)
            .order("submitted_at", { ascending: false, nullsFirst: false })
        : supabase
            .from("assessment_results")
            .select(
              "id, assignment_id, coder_id, status, score, max_score, submitted_at, graded_at, assessment_assignments(assessments(title), classes(name)), profiles!assessment_results_coder_id_fkey(full_name, nickname, coder_id)"
            )
            .order("submitted_at", { ascending: false, nullsFirst: false })
            .limit(200);

    const [assignmentsRes, resultsRes] = await Promise.all([assignmentsQuery, resultsQuery]);
    if (assignmentsRes.error || resultsRes.error) {
      setError(assignmentsRes.error?.message || resultsRes.error?.message || "Failed to load result data");
      return;
    }

    const loadedAssignments = (assignmentsRes.data ?? []).filter((item) => item.coder_id);
    setAssignments(loadedAssignments);
    setResults(resultsRes.data ?? []);
    if (!selectedAssignmentId && loadedAssignments.length) {
      setSelectedAssignmentId(loadedAssignments[0].id);
    }
  }

  const resultLookup = useMemo(() => {
    const map = new Map();
    for (const row of results) {
      map.set(buildResultKey(row.assignment_id, row.coder_id), row);
    }
    return map;
  }, [results]);

  async function handleSaveResult(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!selectedAssignmentId) {
      setError("Select an assignment.");
      return;
    }

    const selectedAssignment = assignments.find((item) => item.id === selectedAssignmentId);
    if (!selectedAssignment?.coder_id) {
      setError("Selected assignment has no direct coder target.");
      return;
    }

    const numericScore = Number(score);
    const numericMaxScore = Number(maxScore);
    if (!Number.isFinite(numericScore) || !Number.isFinite(numericMaxScore) || numericMaxScore <= 0) {
      setError("Score and max score must be valid numbers.");
      return;
    }

    const existing = resultLookup.get(buildResultKey(selectedAssignment.id, selectedAssignment.coder_id));
    const payload = {
      assignment_id: selectedAssignment.id,
      coder_id: selectedAssignment.coder_id,
      status,
      score: numericScore,
      max_score: numericMaxScore,
      submitted_at: new Date().toISOString(),
      graded_at: status === "graded" ? new Date().toISOString() : null,
      graded_by: status === "graded" ? profile?.id : null,
    };

    let writeError = null;
    if (existing?.id) {
      const updateRes = await supabase.from("assessment_results").update(payload).eq("id", existing.id);
      writeError = updateRes.error;
    } else {
      const insertRes = await supabase.from("assessment_results").insert(payload);
      writeError = insertRes.error;
    }

    if (writeError) {
      setError(writeError.message);
      return;
    }

    setMessage("Result saved.");
    await loadData();
  }

  return (
    <main className="container">
      <h1>Results</h1>
      <p>Signed in as {profileDisplayName(profile)}.</p>

      <div className="row gap">
        {profile?.role === "center_lead" ? <Link to="/lead/dashboard">Dashboard</Link> : null}
        {profile?.role === "coach" ? <Link to="/coach/dashboard">Dashboard</Link> : null}
        {profile?.role === "coder" ? <Link to="/coder/dashboard">Dashboard</Link> : null}
        {profile?.role !== "coder" ? <Link to="/assessments">Assessments</Link> : null}
      </div>

      {profile?.role !== "coder" ? (
        <form className="card" onSubmit={handleSaveResult}>
          <h2>Enter / Update Result</h2>
          <label>Direct Coder Assignment</label>
          <select value={selectedAssignmentId} onChange={(e) => setSelectedAssignmentId(e.target.value)} required>
            <option value="" disabled>
              Select assignment
            </option>
            {assignments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.assessments?.title ?? "Untitled"} - {coderDisplayName(item.profiles)} ({item.profiles?.coder_id})
              </option>
            ))}
          </select>
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="graded">Graded</option>
          </select>
          <label>Score</label>
          <input type="number" value={score} onChange={(e) => setScore(e.target.value)} step="0.01" required />
          <label>Max Score</label>
          <input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} step="0.01" required />
          <button type="submit">Save Result</button>
        </form>
      ) : null}

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <section className="card">
        <h2>Result History</h2>
        <table>
          <thead>
            <tr>
              <th>Assessment</th>
              {profile?.role !== "coder" ? <th>Coder</th> : null}
              <th>Class</th>
              <th>Status</th>
              <th>Score</th>
              <th>Submitted</th>
              <th>Graded</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <tr key={row.id}>
                <td>{row.assessment_assignments?.assessments?.title ?? "-"}</td>
                {profile?.role !== "coder" ? (
                  <td>{row.profiles ? `${coderDisplayName(row.profiles)} (${row.profiles.coder_id})` : "-"}</td>
                ) : null}
                <td>{row.assessment_assignments?.classes?.name ?? "-"}</td>
                <td>{row.status}</td>
                <td>
                  {row.score ?? "-"} / {row.max_score ?? "-"}
                </td>
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
