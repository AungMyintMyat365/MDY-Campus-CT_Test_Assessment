import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="container">
      <h1>Page Not Found</h1>
      <Link to="/login">Go to Login</Link>
    </main>
  );
}
