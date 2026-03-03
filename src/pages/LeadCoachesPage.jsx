import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase, supabaseConfigError } from "../lib/supabaseClient";
import { profileDisplayName } from "../lib/displayName";

const FUNCTION_TIMEOUT_MS = 60000;

function getFunctionUrls(functionName) {
  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) return [];

  const normalized = String(base).replace(/\/$/, "");
  const urls = [`${normalized}/functions/v1/${functionName}`];

  try {
    const projectRef = new URL(normalized).host.split(".")[0];
    if (projectRef) {
      urls.push(`https://${projectRef}.functions.supabase.co/${functionName}`);
    }
  } catch (_err) {
    // Ignore URL parsing fallback errors.
  }

  return [...new Set(urls)];
}

function withHardTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs / 1000}s`)), timeoutMs);
    }),
  ]);
}

async function postJsonWithAbort(url, token, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch (_err) {
      payload = null;
    }

    return { response, text, payload };
  } finally {
    clearTimeout(timer);
  }
}

async function invokeFunction(functionName, body) {
  if (!supabase) {
    throw new Error(supabaseConfigError || "Supabase client is not configured");
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message || "Failed to load auth session");
  }
  if (!session?.access_token) {
    throw new Error("Not authenticated. Please sign in again.");
  }

  const urls = getFunctionUrls(functionName);
  if (!urls.length) {
    throw new Error("VITE_SUPABASE_URL is missing or invalid");
  }

  let lastError = null;

  for (const url of urls) {
    try {
      const { response, text, payload } = await withHardTimeout(
        postJsonWithAbort(url, session.access_token, body, FUNCTION_TIMEOUT_MS),
        FUNCTION_TIMEOUT_MS,
        url
      );

      if (!response.ok) {
        const detail = payload?.error || payload?.message || text || "Function request failed";
        throw new Error(`HTTP ${response.status}: ${detail}`);
      }

      return payload;
    } catch (err) {
      if (err?.name === "AbortError" || String(err?.message || "").includes("timed out")) {
        lastError = new Error(`Request timed out after ${FUNCTION_TIMEOUT_MS / 1000}s (${url})`);
        continue;
      }
      if (err instanceof TypeError) {
        lastError = new Error(`Network/CORS error while calling ${url}`);
        continue;
      }
      lastError = err;
    }
  }

  throw lastError || new Error("Function request failed");
}

export default function LeadCoachesPage() {
  const { profile } = useAuth();
  const [coaches, setCoaches] = useState([]);
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvText, setCsvText] = useState("full_name,nickname,email,temp_password");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadCoaches();
  }, []);

  async function loadCoaches() {
    if (!supabase) {
      setError(supabaseConfigError || "Supabase client is not configured");
      return;
    }

    const { data, error: queryError } = await supabase
      .from("profiles")
      .select("id, full_name, nickname, email, is_active, created_at")
      .eq("role", "coach")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(`Load coaches failed: ${queryError.message}`);
      return;
    }
    setCoaches(data ?? []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const data = await invokeFunction("create-coach-account", {
        full_name: fullName,
        nickname,
        email,
        temp_password: tempPassword,
      });

      if (data?.error) {
        setError(data.error);
        return;
      }

      setMessage("Coach account created.");
      setFullName("");
      setNickname("");
      setEmail("");
      setTempPassword("");
      loadCoaches();
    } catch (err) {
      setError(err?.message || "Failed to create coach account");
    } finally {
      setLoading(false);
    }
  }

  async function handleImportSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("Submitting import request...");
    setImporting(true);

    try {
      const data = await invokeFunction("import-coaches-csv", { csv: csvText });

      if (data?.error) {
        setError(data.error);
        setMessage("");
        return;
      }

      setMessage(`Import done. Success: ${data.success_count}, Failed: ${data.failure_count}`);
      loadCoaches();
    } catch (err) {
      setMessage("");
      setError(err?.message || "Failed to import coaches CSV");
    } finally {
      setImporting(false);
    }
  }

  async function handleCsvFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
  }

  return (
    <main className="container">
      <h1>Manage Coaches</h1>
      <p>Signed in as {profileDisplayName(profile)}.</p>
      <div className="row gap">
        <Link to="/lead/dashboard">Dashboard</Link>
        <Link to="/lead/classes">Classes</Link>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <h2>Create Coach Account</h2>
        <label>Full Name</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <label>Nickname</label>
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} required />
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        <label>Temporary Password</label>
        <input type="password" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} minLength={8} autoComplete="new-password" required />
        <button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Coach"}</button>
      </form>

      <form className="card" onSubmit={handleImportSubmit}>
        <h2>Import Coaches CSV</h2>
        <label>Upload CSV File</label>
        <input type="file" accept=".csv,text/csv" onChange={handleCsvFile} />
        <label>Or Paste CSV</label>
        <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={8} />
        <button type="submit" disabled={importing}>{importing ? "Importing..." : "Import Coaches"}</button>
      </form>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <section className="card">
        <h2>Coach List</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Nickname</th>
              <th>Email</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {coaches.map((coach) => (
              <tr key={coach.id}>
                <td>{coach.full_name}</td>
                <td>{coach.nickname ?? "-"}</td>
                <td>{coach.email}</td>
                <td>{coach.is_active ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
