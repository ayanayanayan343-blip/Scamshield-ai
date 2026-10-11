
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./firebase/firebase.js";
import LoginSignup from "./LoginSignup.jsx";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  History,
  Trash2,
  Pencil,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Menu,
  X,
  ArrowRight,
  ScanSearch,
} from "lucide-react";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editId, setEditId] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      setResult(null);
      setMessage("");
      setEditId(null);
      return;
    }

    let cancelled = false;

    async function loadHistory() {
      try {
        const q = query(
          collection(db, "analyses"),
          where("userId", "==", user.uid)
        );

        const snapshot = await getDocs(q);

        const savedHistory = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .sort(
            (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
          );

        if (!cancelled) setHistory(savedHistory);
      } catch (error) {
        console.error("History load failed:", error);
        if (!cancelled) {
          alert("History load nahi hui. Console mein error check karo.");
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const analyzeMessage = async () => {
    if (!message.trim()) {
      alert("Please enter a message!");
      return;
    }

    if (!user) {
      alert("Please login first.");
      return;
    }

    setLoading(true);

    try {
      const text = message.trim().toLowerCase();
      const warnings = [];

      const rules = [
        {
          regex: /urgent|immediately|act now|last chance|24 hours|فوری/i,
          title: "Urgency Tactic",
          detail: "This message pressures you to act quickly.",
          points: 25,
        },
        {
          regex: /https?:\/\/[^\s]+|www\.[^\s]+/i,
          title: "Suspicious Link",
          detail: "A link was detected. Verify its destination independently.",
          points: 20,
        },
        {
          regex: /password|otp|verification code|pin number/i,
          title: "Sensitive Information",
          detail: "The message mentions private account information.",
          points: 30,
        },
        {
          regex: /bank account|account suspended|account blocked|verify your account/i,
          title: "Account Impersonation",
          detail: "The sender may be pretending to represent an organization.",
          points: 25,
        },
        {
          regex: /winner|lottery|free money|claim your prize/i,
          title: "Reward Promise",
          detail: "Unexpected rewards are a common scam warning sign.",
          points: 25,
        },
      ];

      let score = 0;

      rules.forEach((rule) => {
        if (rule.regex.test(text)) {
          warnings.push({
            title: rule.title,
            detail: rule.detail,
          });
          score += rule.points;
        }
      });

      score = Math.min(score, 100);

      const risk =
        score >= 60
          ? "High Risk"
          : score >= 25
          ? "Medium Risk"
          : "Low Risk";

      const analysis = {
        message: message.trim(),
        score,
        risk,
        warnings,
        date: new Date().toLocaleString(),
        createdAt: Date.now(),
      };

      let savedAnalysis;

      if (editId) {
        if (editId.startsWith("temporary-")) {
          alert("Temporary analysis edit nahi ho sakti. Naya analysis karo.");
          return;
        }

        const analysisRef = doc(db, "analyses", editId);

        await updateDoc(analysisRef, {
          ...analysis,
          userId: user.uid,
        });

        savedAnalysis = {
          ...analysis,
          id: editId,
        };

        setHistory((prev) =>
          prev
            .map((item) =>
              item.id === editId ? savedAnalysis : item
            )
            .sort(
              (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
            )
        );
      } else {
        const savedDoc = await addDoc(collection(db, "analyses"), {
          ...analysis,
          userId: user.uid,
        });

        savedAnalysis = {
          ...analysis,
          id: savedDoc.id,
        };

        setHistory((prev) => [savedAnalysis, ...prev]);
      }

      setResult(savedAnalysis);
      setEditId(null);
      setPage("dashboard");
    } catch (error) {
      console.error("Analysis save/update failed:", error);
      alert("Save nahi hua. Console mein error check karo.");
    } finally {
      setLoading(false);
    }
  };

  const deleteHistory = async (id) => {
    if (!user || typeof id !== "string" || id.startsWith("temporary-")) {
      alert("Ye analysis Firebase mein saved nahi hai.");
      return;
    }

    const item = history.find((entry) => entry.id === id);

    if (!item || item.userId !== user.uid) {
      alert("Ye analysis tumhare account ki nahi hai.");
      return;
    }

    try {
      await deleteDoc(doc(db, "analyses", id));

      setHistory((prev) => prev.filter((entry) => entry.id !== id));

      if (result?.id === id) setResult(null);
      if (editId === id) {
        setEditId(null);
        setMessage("");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Analysis delete nahi hui. Dobara try karo.");
    }
  };

  const editHistory = (item) => {
    setMessage(item.message);
    setEditId(item.id);
    setResult(null);
    setPage("dashboard");
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changePage = (name) => {
    setPage(name);
    setMenuOpen(false);
  };

  if (authLoading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  if (!user) {
    return <LoginSignup />;
  }

  return (
    <div className="app">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="logo">
          <div className="logo-icon">
            <ShieldCheck size={27} />
          </div>
          <div>
            <h2>ScamShield</h2>
            <span>AI SECURITY</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav className="navigation">
          <button
            className={page === "dashboard" ? "active" : ""}
            onClick={() => changePage("dashboard")}
          >
            <ScanSearch size={19} /> Dashboard
          </button>

          <button
            className={page === "history" ? "active" : ""}
            onClick={() => changePage("history")}
          >
            <History size={19} /> Analysis History
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="secure-card">
            <Lock size={22} />
            <h4>Stay Protected</h4>
            <p>
              Never share passwords, OTPs, or banking details
              with unknown senders.
            </p>
          </div>
          <p className="sidebar-footer">ScamShield AI © 2026</p>
        </div>
      </aside>

      {menuOpen && (
        <div className="overlay" onClick={() => setMenuOpen(false)} />
      )}

      <main className="main">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>

          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            {page === "dashboard" ? "Dashboard" : "History"}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="top-status">
              <span className="status-dot" />
              Signed in
            </div>

            <button
              onClick={async () => {
                try {
                  await signOut(auth);
                } catch (error) {
                  console.error("Logout failed:", error);
                  alert("Logout nahi hua. Dobara try karo.");
                }
              }}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                border: "1px solid #35445c",
                background: "#111c30",
                color: "white",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {page === "dashboard" ? (
          <div className="content">
            <section className="hero">
              <div className="hero-content">
                <div className="hero-badge">
                  <ShieldCheck size={15} />
                  SMART SCAM DETECTION
                </div>

                <h1>
                  Stay one step ahead of
                  <span> online scams.</span>
                </h1>

                <p>
                  Analyze suspicious emails, text messages,
                  and invoice text for potential fraud warning signs.
                </p>

                <div className="hero-tags">
                  <span><CheckCircle2 size={15} /> Phishing checks</span>
                  <span><CheckCircle2 size={15} /> Risk insights</span>
                </div>
              </div>

              <div className="hero-art">
                <ShieldCheck size={125} strokeWidth={1.2} />
              </div>
            </section>

            <section className="stats">
              <div className="stat-card">
                <div className="stat-icon green"><Search size={22} /></div>
                <div><p>Total Scans</p><h2>{history.length}</h2></div>
              </div>

              <div className="stat-card">
                <div className="stat-icon red"><ShieldAlert size={22} /></div>
                <div>
                  <p>High Risk Found</p>
                  <h2>
                    {history.filter((item) => item.risk === "High Risk").length}
                  </h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon blue"><History size={22} /></div>
                <div><p>Saved Analyses</p><h2>{history.length}</h2></div>
              </div>
            </section>

            <section className="analyzer card">
              <div className="section-heading">
                <div className="heading-icon"><ScanSearch size={23} /></div>
                <div>
                  <h2>{editId ? "Edit Saved Analysis" : "Scam Message Analyzer"}</h2>
                  <p>
                    Paste suspicious content to check for common warning signs.
                  </p>
                </div>
              </div>

              {editId && (
                <p style={{ color: "#60a5fa", marginBottom: 12 }}>
                  Editing a saved analysis. Analyze Message will update this record.
                </p>
              )}

              <label htmlFor="scam-message">MESSAGE CONTENT</label>

              <textarea
                id="scam-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Paste a suspicious message here..."
                rows={7}
                maxLength={10000}
              />

              <div className="input-footer">
                <span>{message.length} / 10000 characters</span>
                <span>Emails • SMS • Invoices</span>
              </div>

              <button
                className="analyze-btn"
                onClick={analyzeMessage}
                disabled={loading}
              >
                <Search size={19} />
                {loading
                  ? "Analyzing..."
                  : editId
                  ? "Save Changes"
                  : "Analyze Message"}
                <ArrowRight size={18} />
              </button>

              {editId && (
                <button
                  onClick={() => {
                    setEditId(null);
                    setMessage("");
                    setResult(null);
                  }}
                  style={{
                    marginTop: 10,
                    padding: "10px 14px",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </section>

            {result && (
              <section className="results card">
                <div className="section-heading">
                  <div className="heading-icon"><ShieldAlert size={23} /></div>
                  <div>
                    <h2>Analysis Result</h2>
                    <p>Rule-based preliminary assessment</p>
                  </div>
                </div>

                <div className="risk-container">
                  <div
                    className={`risk-score ${
                      result.score >= 60 ? "high" : result.score >= 25 ? "medium" : "low"
                    }`}
                  >
                    <h2>{result.score}%</h2>
                    <p>Risk Indicator</p>
                  </div>

                  <div className="risk-description">
                    <h3>{result.risk}</h3>
                    <p>
                      {result.score >= 60
                        ? "Multiple warning signs detected. Verify the sender before responding."
                        : result.score >= 25
                        ? "Some warning signs detected. Verify this message carefully."
                        : "Few common warning signs detected. This does not guarantee the message is safe."}
                    </p>
                  </div>
                </div>

                <h3 className="subheading">
                  <AlertTriangle size={19} /> Warning Signs
                </h3>

                {result.warnings.length ? (
                  <div className="warning-list">
                    {result.warnings.map((warning, index) => (
                      <div className="warning-item" key={index}>
                        <AlertTriangle size={19} />
                        <div><h4>{warning.title}</h4><p>{warning.detail}</p></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-warning">
                    No common warning patterns were detected. Always verify unexpected requests.
                  </p>
                )}

                <h3 className="subheading">
                  <CheckCircle2 size={19} /> Verification Checklist
                </h3>

                <div className="checklist">
                  {[
                    "Verify the sender through an official website or phone number.",
                    "Do not click unexpected links or download attachments.",
                    "Never share passwords or one-time verification codes.",
                    "Contact the organization through a trusted channel.",
                  ].map((tip, index) => (
                    <div key={index} className="check-item">
                      <CheckCircle2 size={18} /><span>{tip}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="privacy-note">
              <Lock size={17} />
              Your saved analyses are associated with your account.
              Verify suspicious messages independently.
            </div>
          </div>
        ) : (
          <div className="content">
            <div className="page-title">
              <h1>Analysis History</h1>
              <p>Your saved analyses from Firebase.</p>
            </div>

            <div className="card history-card">
              {history.length === 0 ? (
                <div className="empty-state">
                  <History size={48} />
                  <h3>No analyses yet</h3>
                  <p>Analyze your first suspicious message to see it here.</p>
                  <button className="analyze-btn" onClick={() => changePage("dashboard")}>
                    Start Analyzing <ArrowRight size={18} />
                  </button>
                </div>
              ) : (
                history.map((item) => (
                  <div className="history-item" key={item.id}>
                    <div className="history-info">
                      <div className="history-top">
                        <span
                          className={`risk-badge ${
                            item.score >= 60 ? "high" : item.score >= 25 ? "medium" : "low"
                          }`}
                        >
                          {item.risk} · {item.score}%
                        </span>
                        <small>{item.date}</small>
                      </div>
                      <p>{item.message}</p>
                    </div>

                    <div className="history-actions">
                      <button
                        type="button"
                        title="Edit message"
                        aria-label="Edit message"
                        onClick={() => editHistory(item)}
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        type="button"
                        title="Delete analysis"
                        aria-label="Delete analysis"
                        className="delete-btn"
                        onClick={() => deleteHistory(item.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
