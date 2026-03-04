import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { profileDisplayName } from "../lib/displayName";
import { supabase, supabaseConfigError } from "../lib/supabaseClient";

function toIsoOrNull(value) {
  if (!value) return null;
  const iso = new Date(value).toISOString();
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

export default function AssessmentsPage() {
  const { profile } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [coders, setCoders] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [googleFormUrl, setGoogleFormUrl] = useState("");

  const [assessmentId, setAssessmentId] = useState("");
  const [targetType, setTargetType] = useState("class");
  const [targetId, setTargetId] = useState("");
  const [dueAt, setDueAt] = useState("");

  useEffect(() => {
    loadData();
  }, [profile?.id, profile?.role]);

  async function loadData() {
    if (!supabase) {
      setError(supabaseConfigError || "Supabase client is not configured");
      return;
    }

    setError("");

    let assessmentsQuery = supabase
      .from("assessments")
      .select("id, title, google_form_url, description, created_at")
      .order("created_at", { ascending: false });

    if (profile?.role === "coach") {
      assessmentsQuery = assessmentsQuery.eq("created_by", profile.id);
    }

    const [assessmentsRes, classesRes, codersRes, assignmentsRes] = await Promise.all([
      assessmentsQuery,
      profile?.role === "coach"
        ? supabase.from("classes").select("id, name").eq("coach_id", profile.id).order("name")
        : supabase.from("classes").select("id, name").order("name"),
      supabase.from("profiles").select("id, full_name, nickname, coder_id").eq("role", "coder").order("full_name"),
      supabase
        .from("assessment_assignments")
        .select(
          "id, due_at, assigned_at, class_id, coder_id, assessments(title), classes(name), profiles!assessment_assignments_coder_id_fkey(full_name, nickname, coder_id)"
        )
        .order("assigned_at", { ascending: false })
        .limit(50),
    ]);

    if (assessmentsRes.error || classesRes.error || codersRes.error || assignmentsRes.error) {
      setError(
        assessmentsRes.error?.message ||
          classesRes.error?.message ||
          codersRes.error?.message ||
          assignmentsRes.error?.message ||
          "Failed to load assessment data"
      );
      return;
    }

    const loadedAssessments = assessmentsRes.data ?? [];
    const loadedClasses = classesRes.data ?? [];
    const loadedCoders = codersRes.data ?? [];

    setAssessments(loadedAssessments);
    setAssignments(assignmentsRes.data ?? []);
    setClasses(loadedClasses);
    setCoders(loadedCoders);

    if (!assessmentId && loadedAssessments.length) setAssessmentId(loadedAssessments[0].id);
    if (!targetId) {
      if (targetType === "class" && loadedClasses.length) setTargetId(loadedClasses[0].id);
      if (targetType === "coder" && loadedCoders.length) setTargetId(loadedCoders[0].id);
    }
  }

  async function handleCreateAssessment(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!profile?.id) {
      setError("Profile is missing. Please sign in again.");
      return;
    }

    const { error: insertError } = await supabase.from("assessments").insert({
      title,
      description: description || null,
      google_form_url: googleFormUrl,
      created_by: profile.id,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setTitle("");
    setDescription("");
    setGoogleFormUrl("");
    setMessage("Assessment created.");
    await loadData();
  }

  async function handleAssignAssessment(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!assessmentId || !targetId) {
      setError("Select assessment and target.");
      return;
    }

    const payload = {
      assessment_id: assessmentId,
      class_id: targetType === "class" ? targetId : null,
      coder_id: targetType === "coder" ? targetId : null,
      assigned_by: profile?.id,
      due_at: toIsoOrNull(dueAt),
    };

    const { error: insertError } = await supabase.from("assessment_assignments").insert(payload);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setMessage("Assessment assigned.");
    setDueAt("");
    await loadData();
  }

  function handleTargetTypeChange(nextType) {
    setTargetType(nextType);
    if (nextType === "class") setTargetId(classes[0]?.id ?? "");
    if (nextType === "coder") setTargetId(coders[0]?.id ?? "");
  }

  return (
    <main className="container">
      <h1>Assessments</h1>
      <p>Signed in as {profileDisplayName(profile)}.</p>

      <div className="row gap">
        {profile?.role === "center_lead" ? <Link to="/lead/dashboard">Dashboard</Link> : null}
        {profile?.role === "coach" ? <Link to="/coach/dashboard">Dashboard</Link> : null}
        <Link to="/results">Results</Link>
      </div>

      <form className="card" onSubmit={handleCreateAssessment}>
        <h2>Create Assessment</h2>
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        <label>Google Form URL</label>
        <input type="url" value={googleFormUrl} onChange={(e) => setGoogleFormUrl(e.target.value)} required />
        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        <button type="submit">Create Assessment</button>
      </form>

      <form className="card" onSubmit={handleAssignAssessment}>
        <h2>Assign Assessment</h2>
        <label>Assessment</label>
        <select value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)} required>
          <option value="" disabled>
            Select assessment
          </option>
          {assessments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>

        <label>Target Type</label>
        <select value={targetType} onChange={(e) => handleTargetTypeChange(e.target.value)}>
          <option value="class">Class</option>
          <option value="coder">Coder</option>
        </select>

        <label>{targetType === "class" ? "Class" : "Coder"}</label>
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)} required>
          <option value="" disabled>
            Select target
          </option>
          {targetType === "class"
            ? classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))
            : coders.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name} {item.nickname ? `@ ${item.nickname}` : ""} ({item.coder_id})
                </option>
              ))}
        </select>

        <label>Due At (optional)</label>
        <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />

        <button type="submit">Assign Assessment</button>
      </form>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <section className="card">
        <h2>Recent Assignments</h2>
        <table>
          <thead>
            <tr>
              <th>Assessment</th>
              <th>Target</th>
              <th>Due</th>
              <th>Assigned At</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((item) => (
              <tr key={item.id}>
                <td>{item.assessments?.title ?? "-"}</td>
                <td>
                  {item.classes?.name ??
                    (item.profiles
                      ? `${item.profiles.full_name}${item.profiles.nickname ? ` @ ${item.profiles.nickname}` : ""} (${item.profiles.coder_id})`
                      : "-")}
                </td>
                <td>{item.due_at ? new Date(item.due_at).toLocaleString() : "-"}</td>
                <td>{new Date(item.assigned_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
