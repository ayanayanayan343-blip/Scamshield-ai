
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "./firebase/firebase.js";

export default function Auth() {
  const [isSignup, setIsSignup] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      } else {
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      }
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please log in.");
      } else if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Email or password is incorrect.");
      } else if (err.code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else {
        setError(err.message || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <div style={styles.logo}>🛡️</div>

        <h1 style={styles.title}>ScamShield AI</h1>
        <p style={styles.subtitle}>
          {isSignup
            ? "Create your secure account"
            : "Welcome back! Log in to continue"}
        </p>

        <label style={styles.label}>Email address</label>
        <input
          style={styles.input}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <label style={styles.label}>Password</label>
        <input
          style={styles.input}
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={6}
          required
        />

        {error && <p style={styles.error}>{error}</p>}

        <button
          type="submit"
          style={styles.button}
          disabled={loading}
        >
          {loading
            ? "Please wait..."
            : isSignup
            ? "Create Account"
            : "Login"}
        </button>

        <p style={styles.switchText}>
          {isSignup
            ? "Already have an account?"
            : "Don't have an account?"}{" "}
          <button
            type="button"
            style={styles.link}
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
            }}
          >
            {isSignup ? "Login" : "Sign up"}
          </button>
        </p>
      </form>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background: "#0b1120",
    color: "#f8fafc",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    padding: "32px",
    border: "1px solid #273449",
    borderRadius: "18px",
    background: "#111c30",
    boxSizing: "border-box",
  },
  logo: { fontSize: "38px", textAlign: "center" },
  title: { textAlign: "center", marginBottom: "8px" },
  subtitle: {
    textAlign: "center",
    color: "#9caec5",
    marginBottom: "28px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "18px",
    boxSizing: "border-box",
    borderRadius: "8px",
    border: "1px solid #35445c",
    background: "#0b1120",
    color: "#ffffff",
    outline: "none",
  },
  button: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "8px",
    background: "#16a34a",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },
  error: { color: "#fca5a5", fontSize: "14px" },
  switchText: {
    textAlign: "center",
    color: "#cbd5e1",
    fontSize: "14px",
    marginTop: "22px",
  },
  link: {
    background: "none",
    border: "none",
    color: "#60a5fa",
    cursor: "pointer",
    fontWeight: "bold",
  },
};
