import React, { useState, useEffect, useCallback } from "react";
import { 
  LogIn, 
  UserPlus, 
  LogOut, 
  Users, 
  ListChecks, 
  ClipboardList, 
  Plus, 
  Trash2, 
  Pencil, 
  Check, 
  X, 
  Award, 
  ChevronRight, 
  Loader2 
} from "lucide-react";
import { supabase } from "./supabaseClient";

/* ---------- storage keys (for local fallback / cache) ---------- */
const KEY_USERS = "users";
const KEY_QUESTIONS = "questions";
const KEY_SUBMISSIONS = "submissions";

// Kiểm tra xem Supabase đã được cấu hình thật sự chưa
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return url && key && !url.includes("your-project-id") && url !== "https://placeholder.supabase.co" && key !== "placeholder-key";
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------- root ---------- */
export default function App() {
  const [booting, setBooting] = useState(true);
  const [users, setUsers] = useState({});
  const [questions, setQuestions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Tải dữ liệu ban đầu
  useEffect(() => {
    (async () => {
      let u = {};
      let q = [];
      let s = [];
      
      if (isSupabaseConfigured()) {
        try {
          const [resUsers, resQuestions, resSubmissions] = await Promise.all([
            supabase.from('users').select('*'),
            supabase.from('questions').select('*'),
            supabase.from('submissions').select('*')
          ]);
          
          if (!resUsers.error && resUsers.data) {
            const usersObj = {};
            resUsers.data.forEach(user => {
              usersObj[user.username] = user;
            });
            u = usersObj;
          } else if (resUsers.error) {
            console.error("Error loading users from Supabase:", resUsers.error);
          }
          
          if (!resQuestions.error && resQuestions.data) {
            q = resQuestions.data.map(item => ({
              id: item.id,
              question: item.question,
              options: item.options,
              correctIndex: item.correctIndex
            }));
          } else if (resQuestions.error) {
            console.error("Error loading questions from Supabase:", resQuestions.error);
          }
          
          if (!resSubmissions.error && resSubmissions.data) {
            s = resSubmissions.data.map(item => ({
              id: item.id,
              username: item.username,
              fullName: item.fullName,
              date: item.date,
              correct: item.correct,
              total: item.total,
              score: Number(item.score),
              detail: item.detail
            }));
          } else if (resSubmissions.error) {
            console.error("Error loading submissions from Supabase:", resSubmissions.error);
          }
          
          // Lưu dự phòng cache local
          localStorage.setItem(KEY_USERS, JSON.stringify(u));
          localStorage.setItem(KEY_QUESTIONS, JSON.stringify(q));
          localStorage.setItem(KEY_SUBMISSIONS, JSON.stringify(s));
          
        } catch (e) {
          console.warn("Failed to fetch from Supabase, loading from local cache...", e);
          u = JSON.parse(localStorage.getItem(KEY_USERS) || "{}");
          q = JSON.parse(localStorage.getItem(KEY_QUESTIONS) || "[]");
          s = JSON.parse(localStorage.getItem(KEY_SUBMISSIONS) || "[]");
        }
      } else {
        // Chế độ Offline / Chưa cấu hình
        u = JSON.parse(localStorage.getItem(KEY_USERS) || "{}");
        q = JSON.parse(localStorage.getItem(KEY_QUESTIONS) || "[]");
        s = JSON.parse(localStorage.getItem(KEY_SUBMISSIONS) || "[]");
      }
      
      setUsers(u);
      setQuestions(q);
      setSubmissions(s);
      setBooting(false);
    })();
  }, []);

  // Lưu người dùng
  const persistUsers = useCallback(async (nextUsers, newRecord) => {
    setUsers(nextUsers);
    
    if (isSupabaseConfigured() && newRecord) {
      try {
        const { error } = await supabase.from('users').upsert(newRecord);
        if (error) console.error("Error upserting user to Supabase:", error);
      } catch (e) {
        console.error("Supabase upsert failed:", e);
      }
    }
    
    try {
      localStorage.setItem(KEY_USERS, JSON.stringify(nextUsers));
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Lưu câu hỏi (đồng bộ toàn bộ danh sách)
  const persistQuestions = useCallback(async (nextQuestions) => {
    setQuestions(nextQuestions);
    
    if (isSupabaseConfigured()) {
      try {
        // Để đồng bộ danh sách đơn giản nhất, ta xóa hết câu hỏi cũ và ghi lại toàn bộ
        const { error: deleteError } = await supabase.from('questions').delete().neq('id', 'placeholder_nonexistent_id');
        if (deleteError) {
          console.error("Supabase delete questions error:", deleteError);
        }
        
        if (nextQuestions.length > 0) {
          const { error: insertError } = await supabase.from('questions').insert(
            nextQuestions.map(q => ({
              id: q.id,
              question: q.question,
              options: q.options,
              correctIndex: q.correctIndex
            }))
          );
          if (insertError) console.error("Supabase insert questions error:", insertError);
        }
      } catch (e) {
        console.error("Supabase sync questions failed:", e);
      }
    }
    
    try {
      localStorage.setItem(KEY_QUESTIONS, JSON.stringify(nextQuestions));
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Lưu bài nộp
  const persistSubmissions = useCallback(async (nextSubmissions, newRecord) => {
    setSubmissions(nextSubmissions);
    
    if (isSupabaseConfigured() && newRecord) {
      try {
        const { error } = await supabase.from('submissions').insert({
          id: newRecord.id,
          username: newRecord.username,
          fullName: newRecord.fullName,
          date: newRecord.date,
          correct: newRecord.correct,
          total: newRecord.total,
          score: newRecord.score,
          detail: newRecord.detail
        });
        if (error) console.error("Error inserting submission to Supabase:", error);
      } catch (e) {
        console.error("Supabase submission failed:", e);
      }
    }
    
    try {
      localStorage.setItem(KEY_SUBMISSIONS, JSON.stringify(nextSubmissions));
    } catch (e) {
      console.error(e);
    }
  }, []);

  if (booting) {
    return (
      <div className="booting-screen">
        <Loader2 className="booting-spinner" size={32} />
        <div className="booting-text">
          Đang tải hệ thống và cơ sở dữ liệu...
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        users={users}
        onRegister={async (username, password, fullName) => {
          if (users[username]) return "Tên đăng nhập đã tồn tại.";
          const isFirst = Object.keys(users).length === 0;
          const userObj = { username, password, fullName, role: isFirst ? "admin" : "employee" };
          const next = {
            ...users,
            [username]: userObj,
          };
          await persistUsers(next, userObj);
          setCurrentUser(userObj);
          return null;
        }}
        onLogin={(username, password) => {
          const u = users[username];
          if (!u || u.password !== password) return "Sai tên đăng nhập hoặc mật khẩu.";
          setCurrentUser(u);
          return null;
        }}
      />
    );
  }

  return (
    <Dashboard
      currentUser={currentUser}
      onLogout={() => setCurrentUser(null)}
      users={users}
      questions={questions}
      submissions={submissions}
      persistQuestions={persistQuestions}
      persistSubmissions={persistSubmissions}
    />
  );
}

/* ---------- Auth screen ---------- */
function AuthScreen({ users, onRegister, onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const noUsersYet = Object.keys(users).length === 0;

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim() || (mode === "register" && !fullName.trim())) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    setBusy(true);
    let err = null;
    if (mode === "login") {
      err = onLogin(username.trim(), password);
    } else {
      err = await onRegister(username.trim(), password, fullName.trim());
    }
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="header-title-main" style={{ fontSize: "1.75rem" }}>
            Bài Thi Trắc Nghiệm Nội Bộ
          </div>
          <div className="header-subtitle" style={{ fontSize: "0.85rem", marginTop: 6 }}>
            Hệ thống quản lý nhân viên &amp; chấm điểm tự động
          </div>
        </div>

        <div className="paper-card" style={{ padding: 28 }}>
          <div className="auth-tabs-toggle">
            <button 
              type="button" 
              className={`auth-tab-item ${mode === "login" ? "active" : ""}`}
              onClick={() => { setMode("login"); setError(""); }}
            >
              <LogIn size={14} /> Đăng nhập
            </button>
            <button 
              type="button" 
              className={`auth-tab-item ${mode === "register" ? "active" : ""}`}
              onClick={() => { setMode("register"); setError(""); }}
            >
              <UserPlus size={14} /> Đăng ký
            </button>
          </div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {mode === "register" && (
              <div className="form-field">
                <label className="form-label">Họ và tên</label>
                <input 
                  className="input-text" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="Nguyễn Văn A" 
                />
              </div>
            )}
            <div className="form-field">
              <label className="form-label">Tên đăng nhập</label>
              <input 
                className="input-text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="ten.dangnhap" 
                autoCapitalize="off" 
              />
            </div>
            <div className="form-field">
              <label className="form-label">Mật khẩu</label>
              <input 
                className="input-text" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
              />
            </div>

            {mode === "register" && noUsersYet && (
              <div style={{ 
                fontSize: 12, 
                color: "var(--primary)", 
                background: "var(--primary-light)", 
                padding: "10px 12px", 
                borderRadius: "var(--radius-sm)",
                marginBottom: 14,
                fontWeight: 500
              }}>
                Tài khoản đầu tiên đăng ký sẽ trở thành Quản trị viên.
              </div>
            )}

            {error && (
              <div style={{ 
                fontSize: 13, 
                color: "var(--danger)", 
                background: "var(--danger-bg)", 
                border: "1px solid var(--danger-border)",
                padding: "10px 12px", 
                borderRadius: "var(--radius-sm)",
                marginBottom: 14,
                fontWeight: 500
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn btn-primary" style={{ width: "100%", marginTop: 8 }}>
              {busy ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ---------- Dashboard shell ---------- */
function Dashboard({ currentUser, onLogout, users, questions, submissions, persistQuestions, persistSubmissions }) {
  const isAdmin = currentUser.role === "admin";
  const [tab, setTab] = useState(isAdmin ? "questions" : "exam");

  const employeeTabs = [
    { key: "exam", label: "Làm bài thi", icon: ClipboardList },
    { key: "history", label: "Lịch sử làm bài", icon: ListChecks },
  ];
  const adminTabs = [
    { key: "questions", label: "Ngân hàng câu hỏi", icon: ListChecks },
    { key: "employees", label: "Quản lý nhân viên", icon: Users },
    { key: "results", label: "Kết quả", icon: Award },
  ];
  const tabs = isAdmin ? adminTabs : employeeTabs;

  return (
    <div className="app-viewport animate-fade-in">
      <div style={{ width: "100%", maxWidth: 900, margin: "0 auto", padding: "24px 16px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div className="header-title-main">Bài Thi Trắc Nghiệm Nội Bộ</div>
            <div className="header-subtitle">
              Xin chào, <strong>{currentUser.fullName}</strong> · {isAdmin ? "Quản trị viên" : "Nhân viên"}
              {!isSupabaseConfigured() && (
                <span style={{ 
                  color: "var(--danger)", 
                  marginLeft: 12, 
                  fontSize: "0.785rem", 
                  background: "var(--danger-bg)", 
                  padding: "2px 8px", 
                  borderRadius: "var(--radius-sm)", 
                  border: "1px solid var(--danger-border)" 
                }}>
                  Chế độ Offline (Chưa kết nối DB)
                </span>
              )}
            </div>
          </div>
          <button onClick={onLogout} className="btn btn-ghost" style={{ padding: "8px 14px", height: "auto" }}>
            <LogOut size={14} /> Đăng xuất
          </button>
        </div>

        <div className="tabs-container">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`tab-btn ${tab === t.key ? "active" : ""}`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {!isAdmin && tab === "exam" && (
          <ExamPanel
            currentUser={currentUser}
            questions={questions}
            submissions={submissions}
            persistSubmissions={persistSubmissions}
            goHistory={() => setTab("history")}
          />
        )}
        {!isAdmin && tab === "history" && (
          <HistoryPanel currentUser={currentUser} submissions={submissions} />
        )}

        {isAdmin && tab === "questions" && (
          <QuestionBankPanel questions={questions} persistQuestions={persistQuestions} />
        )}
        {isAdmin && tab === "employees" && (
          <EmployeesPanel users={users} submissions={submissions} />
        )}
        {isAdmin && tab === "results" && (
          <ResultsPanel submissions={submissions} />
        )}
      </div>
    </div>
  );
}

/* ---------- Employee: Exam ---------- */
function ExamPanel({ currentUser, questions, submissions, persistSubmissions, goHistory }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (questions.length === 0) {
    return (
      <EmptyState
        title="Chưa có câu hỏi nào"
        desc="Quản trị viên chưa thêm câu hỏi vào ngân hàng câu hỏi. Vui lòng quay lại sau."
      />
    );
  }

  if (result) {
    return <ResultCard result={result} onBack={() => { setResult(null); setAnswers({}); goHistory(); }} />;
  }

  const answeredCount = Object.keys(answers).length;
  const percent = Math.round((answeredCount / questions.length) * 100);

  async function handleSubmit() {
    setSubmitting(true);
    let correct = 0;
    const detail = questions.map((q) => {
      const chosen = answers[q.id];
      const isCorrect = chosen === q.correctIndex;
      if (isCorrect) correct += 1;
      return { questionId: q.id, question: q.question, chosen, correctIndex: q.correctIndex, isCorrect };
    });
    const total = questions.length;
    const score = Math.round((correct / total) * 1000) / 100; // out of 10, 2 decimals
    const record = {
      id: uid(),
      username: currentUser.username,
      fullName: currentUser.fullName,
      date: new Date().toISOString(),
      correct,
      total,
      score,
      detail,
    };
    await persistSubmissions([record, ...submissions], record);
    setSubmitting(false);
    setResult(record);
  }

  return (
    <div className="animate-slide-up">
      <div className="exam-summary-bar">
        <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", flex: 1 }}>
          Đã trả lời <strong style={{ color: "var(--text-main)", fontFamily: "'IBM Plex Mono', monospace" }}>{answeredCount}/{questions.length}</strong> câu ({percent}%).
          <div className="progress-container">
            <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>

      <div className="question-list">
        {questions.map((q, idx) => (
          <div key={q.id} className="paper-card question-card">
            <div className="question-header">
              <span className="question-badge">{idx + 1}</span>
              <div className="question-text">{q.question}</div>
            </div>
            <div className="options-grid">
              {q.options.map((opt, oi) => {
                const selected = answers[q.id] === oi;
                return (
                  <button
                    key={oi}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    className={`option-btn ${selected ? "selected" : ""}`}
                  >
                    <span className="option-bubble">{LETTERS[oi]}</span>
                    <span style={{ color: "var(--text-main)", fontWeight: 500 }}>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn btn-primary"
          style={{ padding: "12px 28px", fontSize: "0.95rem" }}
        >
          {submitting ? "Đang chấm điểm..." : "Nộp bài"} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ---------- Result / stamp ---------- */
function ResultCard({ result, onBack }) {
  const pass = result.score >= 5.0;
  return (
    <div className="paper-card result-card-container animate-slide-up">
      <div className="decor-tear" style={{ position: "absolute", left: 0, right: 0, top: 0 }} />
      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 12 }}>Kết quả bài thi</div>
      
      <div className="score-main">
        {result.score.toFixed(2)}
        <span className="score-total">/10</span>
      </div>
      
      <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 16 }}>
        Đúng {result.correct}/{result.total} câu
      </div>

      <div className={`status-stamp ${pass ? "pass" : "fail"}`}>
        {pass ? <Check size={16} style={{ strokeWidth: 3 }} /> : <X size={16} style={{ strokeWidth: 3 }} />} 
        {pass ? "Đạt" : "Chưa đạt"}
      </div>

      <div style={{ marginTop: 32 }}>
        <div className="details-header">CHI TIẾT ĐÁP ÁN</div>
        <div className="answer-detail-list">
          {result.detail.map((d, i) => (
            <div
              key={d.questionId}
              className={`answer-detail-item ${d.isCorrect ? "correct" : "incorrect"}`}
            >
              {d.isCorrect ? (
                <Check size={15} style={{ color: "var(--success)", flexShrink: 0, marginTop: 2, strokeWidth: 2.5 }} />
              ) : (
                <X size={15} style={{ color: "var(--danger)", flexShrink: 0, marginTop: 2, strokeWidth: 2.5 }} />
              )}
              <div>
                <strong>Câu {i + 1}:</strong> {d.question}
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 3 }}>
                  <span>Đáp án bạn chọn: <strong>{d.chosen !== undefined ? LETTERS[d.chosen] : "Chưa chọn"}</strong></span>
                  <span style={{ marginLeft: 12 }}>Đáp án đúng: <strong>{LETTERS[d.correctIndex]}</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onBack} className="btn btn-primary" style={{ marginTop: 28, padding: "11px 24px" }}>
        Xem lịch sử làm bài
      </button>
    </div>
  );
}

/* ---------- Employee: History ---------- */
function HistoryPanel({ currentUser, submissions }) {
  const mine = submissions.filter((s) => s.username === currentUser.username);
  
  if (mine.length === 0) {
    return (
      <EmptyState 
        title="Chưa có lịch sử" 
        desc="Bạn chưa nộp bài thi nào. Hãy bắt đầu làm bài ở tab Làm bài thi." 
      />
    );
  }
  
  return (
    <div className="history-list animate-slide-up">
      {mine.map((s) => {
        const pass = s.score >= 5.0;
        return (
          <div key={s.id} className="paper-card history-item">
            <div>
              <div className="history-date">{new Date(s.date).toLocaleString("vi-VN")}</div>
              <div className="history-meta">Đúng {s.correct}/{s.total} câu</div>
            </div>
            <div className={`history-score ${pass ? "pass" : "fail"}`}>
              {s.score.toFixed(2)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Admin: Question bank ---------- */
function QuestionBankPanel({ questions, persistQuestions }) {
  const [editing, setEditing] = useState(null); // question object

  return (
    <div className="animate-slide-up">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
        <button
          onClick={() => setEditing({ id: null, question: "", options: ["", ""], correctIndex: 0 })}
          className="btn btn-primary"
        >
          <Plus size={15} /> Thêm câu hỏi
        </button>
      </div>

      {editing && (
        <QuestionEditor
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={async (q) => {
            let next;
            if (q.id) {
              next = questions.map((x) => (x.id === q.id ? q : x));
            } else {
              next = [...questions, { ...q, id: uid() }];
            }
            await persistQuestions(next);
            setEditing(null);
          }}
        />
      )}

      {questions.length === 0 && !editing && (
        <EmptyState 
          title="Ngân hàng câu hỏi trống" 
          desc="Nhấn “Thêm câu hỏi” để tạo câu hỏi trắc nghiệm đầu tiên." 
        />
      )}

      <div className="question-list" style={{ marginTop: editing ? 18 : 0 }}>
        {questions.map((q, idx) => (
          <div key={q.id} className="paper-card question-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div className="question-text" style={{ fontSize: "0.95rem" }}>
                {idx + 1}. {q.question}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => setEditing(q)} className="btn-icon-only" title="Sửa câu hỏi">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) {
                      await persistQuestions(questions.filter((x) => x.id !== q.id));
                    }
                  }}
                  className="btn-icon-only"
                  style={{ color: "var(--danger)", borderColor: "var(--danger-border)" }}
                  title="Xóa câu hỏi"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {q.options.map((opt, oi) => {
                const isCorrect = oi === q.correctIndex;
                return (
                  <span
                    key={oi}
                    style={{
                      fontSize: "0.785rem",
                      padding: "5px 10px",
                      borderRadius: "var(--radius-sm)",
                      background: isCorrect ? "var(--success-bg)" : "#f0f3f2",
                      color: isCorrect ? "var(--success)" : "var(--text-muted)",
                      fontWeight: isCorrect ? 700 : 500,
                      border: isCorrect ? "1px solid var(--success-border)" : "1px solid transparent"
                    }}
                  >
                    {LETTERS[oi]}. {opt}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionEditor({ initial, onCancel, onSave }) {
  const [question, setQuestion] = useState(initial.question);
  const [options, setOptions] = useState(initial.options);
  const [correctIndex, setCorrectIndex] = useState(initial.correctIndex);
  const [error, setError] = useState("");

  function updateOption(i, val) {
    setOptions((o) => o.map((x, idx) => (idx === i ? val : x)));
  }

  // Thêm lựa chọn
  function addOption() {
    if (options.length >= 6) return;
    setOptions((o) => [...o, ""]);
  }

  // Xóa lựa chọn
  function removeOption(i) {
    if (options.length <= 2) return;
    setOptions((o) => o.filter((_, idx) => idx !== i));
    if (correctIndex === i) {
      setCorrectIndex(0);
    } else if (correctIndex > i) {
      setCorrectIndex((c) => c - 1);
    }
  }

  function save() {
    if (!question.trim()) return setError("Vui lòng nhập nội dung câu hỏi.");
    if (options.some((o) => !o.trim())) return setError("Vui lòng điền đầy đủ các đáp án.");
    setError("");
    onSave({ 
      id: initial.id, 
      question: question.trim(), 
      options: options.map((o) => o.trim()), 
      correctIndex 
    });
  }

  return (
    <div className="paper-card editor-card animate-slide-up">
      <div className="editor-title">
        {initial.id ? "Chỉnh sửa câu hỏi" : "Tạo câu hỏi mới"}
      </div>

      <div className="form-field">
        <label className="form-label">Nội dung câu hỏi</label>
        <textarea 
          className="input-text" 
          style={{ minHeight: 70, resize: "vertical" }} 
          value={question} 
          onChange={(e) => setQuestion(e.target.value)} 
          placeholder="Nhập câu hỏi trắc nghiệm..." 
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <label className="form-label">Các đáp án (Chọn vòng tròn phía trước để đánh dấu đáp án đúng)</label>
        <div className="options-editor-list">
          {options.map((opt, i) => {
            const isCorrect = correctIndex === i;
            return (
              <div key={i} className="option-edit-row">
                <button
                  type="button"
                  onClick={() => setCorrectIndex(i)}
                  title="Đánh dấu đáp án đúng"
                  className="option-bubble"
                  style={{
                    backgroundColor: isCorrect ? "var(--primary)" : "transparent",
                    color: isCorrect ? "#ffffff" : "var(--text-muted)",
                    borderColor: isCorrect ? "var(--primary)" : "var(--text-light)",
                    cursor: "pointer"
                  }}
                >
                  {LETTERS[i]}
                </button>
                <input 
                  className="input-text" 
                  style={{ flex: 1 }} 
                  value={opt} 
                  onChange={(e) => updateOption(i, e.target.value)} 
                  placeholder={`Nhập lựa chọn ${LETTERS[i]}`} 
                />
                {options.length > 2 && (
                  <button 
                    type="button"
                    onClick={() => removeOption(i)} 
                    className="btn-icon-only"
                    style={{ color: "var(--danger)", borderColor: "var(--danger-border)" }}
                    title="Xóa lựa chọn này"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {options.length < 6 && (
          <button 
            type="button"
            onClick={addOption} 
            className="btn btn-secondary" 
            style={{ alignSelf: "flex-start", marginTop: 12, padding: "8px 14px", fontSize: "0.8rem" }}
          >
            <Plus size={13} /> Thêm đáp án
          </button>
        )}
      </div>

      {error && (
        <div style={{ 
          fontSize: 13, 
          color: "var(--danger)", 
          background: "var(--danger-bg)", 
          border: "1px solid var(--danger-border)",
          padding: "8px 12px", 
          borderRadius: "var(--radius-sm)",
          marginTop: 14 
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 20, borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
        <button onClick={save} className="btn btn-primary">Lưu câu hỏi</button>
        <button onClick={onCancel} className="btn btn-ghost">Hủy bỏ</button>
      </div>
    </div>
  );
}

/* ---------- Admin: Employees ---------- */
function EmployeesPanel({ users, submissions }) {
  const employees = Object.values(users).filter((u) => u.role === "employee");
  
  if (employees.length === 0) {
    return (
      <EmptyState 
        title="Chưa có nhân viên" 
        desc="Nhân viên sẽ xuất hiện ở đây sau khi họ đăng ký tài khoản." 
      />
    );
  }
  
  return (
    <div className="paper-card table-container animate-slide-up" style={{ padding: 0 }}>
      <table className="premium-table">
        <thead>
          <tr>
            <th>Họ và tên</th>
            <th>Tên đăng nhập</th>
            <th>Số lần thi</th>
            <th>Điểm cao nhất</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => {
            const mine = submissions.filter((s) => s.username === e.username);
            const best = mine.length ? Math.max(...mine.map((s) => s.score)) : null;
            const pass = best !== null && best >= 5.0;
            return (
              <tr key={e.username}>
                <td style={{ fontWeight: 600 }}>{e.fullName}</td>
                <td style={{ color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.8rem" }}>
                  {e.username}
                </td>
                <td>{mine.length} lần</td>
                <td style={{ 
                  fontWeight: 700, 
                  color: best !== null ? (pass ? "var(--success)" : "var(--danger)") : "var(--text-light)",
                  fontFamily: "'IBM Plex Mono', monospace"
                }}>
                  {best !== null ? best.toFixed(2) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Admin: Results ---------- */
function ResultsPanel({ submissions }) {
  if (submissions.length === 0) {
    return (
      <EmptyState 
        title="Chưa có kết quả" 
        desc="Kết quả bài thi của nhân viên sẽ hiển thị tại đây." 
      />
    );
  }
  
  const sorted = [...submissions].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return (
    <div className="paper-card table-container animate-slide-up" style={{ padding: 0 }}>
      <table className="premium-table">
        <thead>
          <tr>
            <th>Nhân viên</th>
            <th>Thời gian nộp</th>
            <th>Số câu đúng</th>
            <th>Điểm số</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => {
            const pass = s.score >= 5.0;
            return (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.fullName}</td>
                <td style={{ color: "var(--text-muted)" }}>
                  {new Date(s.date).toLocaleString("vi-VN")}
                </td>
                <td style={{ fontWeight: 500 }}>{s.correct}/{s.total}</td>
                <td style={{ 
                  fontWeight: 700, 
                  fontFamily: "'IBM Plex Mono', monospace", 
                  color: pass ? "var(--success)" : "var(--danger)" 
                }}>
                  {s.score.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- shared: empty state ---------- */
function EmptyState({ title, desc }) {
  return (
    <div className="paper-card empty-state-card">
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-desc">{desc}</div>
    </div>
  );
}
