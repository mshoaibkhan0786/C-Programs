// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  CheckCircle,
  Trash2,
  Plus,
  Edit2,
  Moon,
  Sun,
  LogOut,
  LogIn,
} from "react-feather";

import { auth, db } from "./firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";

// Optional: syntax highlighter (if installed)
// import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const ADMIN_EMAIL = "mshoaibkhan0988@gmail.com"; // keep your admin email

const DEFAULT_CATEGORIES = [
  "Strings",
  "1D arrays",
  "2D arrays",
  "Functions",
  "Recursion",
  "Pointers",
  "Structures",
  "File handling",
  "Loops & Patterns",
];

export default function App() {
  // data
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  // auth & admin
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // UI state
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingText, setAddingText] = useState("");
  const [addingCategory, setAddingCategory] = useState(DEFAULT_CATEGORIES[0]);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editQuestionId, setEditQuestionId] = useState(null);
  const [editQuestionText, setEditQuestionText] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState(null); // {type: 'question'|'category', id, name}

  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  // refs for scrolling
  const refs = useRef({});

  // local UI-only fields are stored as transient props on question objects:
  // { showCode, editingCode, editingCodeValue, editing }

  // ---------- theme ----------
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // ---------- auth listener ----------
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      setIsAdmin(u?.email === ADMIN_EMAIL);
    });
    return unsub;
  }, []);

  // ---------- realtime listeners ----------
  useEffect(() => {
    // categories collection - if you have categories in firestore, prefer that, else keep default
    const catsCol = collection(db, "categories");
    const qCats = query(catsCol, orderBy("createdAt", "asc"));
    const unsubCats = onSnapshot(
      qCats,
      (snap) => {
        const arr = snap.docs.map((d) => d.data()?.name).filter(Boolean);
        if (arr.length) setCategories(arr);
      },
      (err) => {
        // ignore if categories collection doesn't exist or insufficient permission
        // fallback: keep local DEFAULT_CATEGORIES
        // console.warn("cat listen err", err);
      }
    );

    // questions listener
    const q = query(collection(db, "questions"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            text: data.text || "",
            category: data.category || DEFAULT_CATEGORIES[0],
            complete: !!data.complete,
            code: data.code || "",
            // transient UI props
            showCode: false,
            editingCode: false,
            editingCodeValue: "",
            editing: false,
            editingText: "",
          };
        });
        // dedupe by id just in case
        const uniq = [];
        const seen = new Set();
        for (const it of arr) {
          if (!seen.has(it.id)) {
            uniq.push(it);
            seen.add(it.id);
          }
        }
        setQuestions(uniq);
      },
      (err) => {
        console.error("questions listener error:", err);
      }
    );

    return () => {
      unsub();
      unsubCats();
    };
  }, []);

  // ---------- helpers ----------
  function scrollToCategory(cat) {
    const el = refs.current[cat];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- CRUD ----------

  async function addQuestion() {
    const text = (addingText || "").trim();
    if (!text) return alert("Enter question text");
    try {
      await addDoc(collection(db, "questions"), {
        text,
        category: addingCategory,
        complete: false,
        code: "",
        createdAt: serverTimestamp(),
      });
      setAddingText("");
      setShowAddModal(false);
    } catch (err) {
      console.error("addQuestion err", err);
      alert("Failed to add question (check console)");
    }
  }

  async function toggleComplete(id) {
    try {
      const qRef = doc(db, "questions", id);
      const local = questions.find((x) => x.id === id);
      if (!local) return;
      await updateDoc(qRef, { complete: !local.complete });
    } catch (err) {
      console.error("toggleComplete err", err);
      alert("Failed to toggle");
    }
  }

  async function deleteQuestionConfirmed(id) {
    if (!isAdmin) return alert("Only admin can delete");
    try {
      await deleteDoc(doc(db, "questions", id));
      setConfirmOpen(false);
      setConfirmData(null);
    } catch (err) {
      console.error("deleteQuestion err", err);
      alert("Failed to delete");
    }
  }

  async function deleteCategoryConfirmed(name) {
    if (!isAdmin) return alert("Only admin can delete category");
    try {
      // delete category doc(s)
      const catDocs = await getDocs(collection(db, "categories"));
      for (const d of catDocs.docs) {
        if (d.data()?.name === name) {
          await deleteDoc(doc(db, "categories", d.id));
        }
      }
      // delete questions in this category
      const qSnap = await getDocs(collection(db, "questions"));
      for (const d of qSnap.docs) {
        if (d.data()?.category === name) {
          await deleteDoc(doc(db, "questions", d.id));
        }
      }
      setConfirmOpen(false);
      setConfirmData(null);
    } catch (err) {
      console.error("deleteCategory err", err);
      alert("Failed to delete category");
    }
  }

  function confirmDelete(type, idOrName, label) {
    setConfirmData({ type, idOrName, label });
    setConfirmOpen(true);
  }

  // edit question text modal
  function openEditQuestionModal(q) {
    setEditQuestionId(q.id);
    setEditQuestionText(q.text);
    setEditModalOpen(true);
  }

  async function saveEditedQuestion() {
    if (!editQuestionText.trim()) return alert("Text cannot be empty");
    try {
      await updateDoc(doc(db, "questions", editQuestionId), { text: editQuestionText.trim() });
      setEditModalOpen(false);
      setEditQuestionId(null);
      setEditQuestionText("");
    } catch (err) {
      console.error("saveEditedQuestion err", err);
      alert("Failed to save question");
    }
  }

  // code editing (admin)
  function openEditCode(qId) {
    setQuestions((prev) => prev.map((x) => (x.id === qId ? { ...x, editingCode: true, editingCodeValue: x.code ?? "" } : x)));
  }

  async function saveCode(qId) {
    const q = questions.find((x) => x.id === qId);
    if (!q) return;
    if (!isAdmin) return alert("Only admin can save code");
    try {
      await updateDoc(doc(db, "questions", qId), { code: q.editingCodeValue ?? "" });
      setQuestions((prev) => prev.map((x) => (x.id === qId ? { ...x, editingCode: false, code: q.editingCodeValue ?? "" } : x)));
    } catch (err) {
      console.error("saveCode err", err);
      alert("Failed to save code");
    }
  }

  // update local editingCodeValue
  function changeEditingCodeValue(qId, v) {
    setQuestions((prev) => prev.map((x) => (x.id === qId ? { ...x, editingCodeValue: v } : x)));
  }

  // add category doc (admin)
  async function addCategory(name) {
    const nm = (name || "").trim();
    if (!nm) return alert("Enter category name");
    try {
      // add category document to firestore
      await addDoc(collection(db, "categories"), { name: nm, createdAt: serverTimestamp() });
      // listener will update categories state
    } catch (err) {
      console.error("addCategory err", err);
      alert("Failed to add category");
    }
  }

  // ---------- grouping ----------
  const grouped = categories.map((c) => ({
    name: c,
    items: questions.filter((q) => q.category === c && q.text.toLowerCase().includes(search.toLowerCase())),
  }));

  // ---------- UI bits ----------
  return (
    <div className={`min-h-screen antialiased ${theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-start gap-6">
          {/* SIDEBAR */}
          <aside className={`w-72 rounded-2xl p-5 ${theme === "dark" ? "bg-gray-800/60" : "bg-white"} shadow-sm border ${theme === "dark" ? "border-gray-700" : "border-gray-100"}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-xl font-extrabold" style={{ color: "#5b4fcf" }}>Study Tracker</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                  className="p-2 rounded-md hover:bg-gray-100/40"
                  title="Toggle theme"
                >
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              </div>
            </div>

            <div className="text-xs font-medium text-gray-500 mb-2 flex items-center justify-between">
              <span>Categories</span>
              {isAdmin && (
                <button
                  onClick={() => {
                    const name = prompt("Category name:");
                    if (name) addCategory(name);
                  }}
                  className="text-indigo-600 hover:underline text-sm"
                  title="Add category"
                >
                  + Add
                </button>
              )}
            </div>

            <nav className="space-y-1 overflow-auto" style={{ maxHeight: "62vh", paddingRight: 4 }}>
              {categories.map((c, i) => (
                <div key={c} className="flex items-center gap-2">
                  <button
                    onClick={() => scrollToCategory(c)}
                    className="flex-1 text-left py-2 px-2 rounded-md hover:bg-indigo-50/50"
                  >
                    <span className="text-sm font-medium mr-2 text-gray-400">{i + 1}.</span>
                    <span className="text-sm">{c}</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => confirmDelete("category", c, c)}
                      className="text-red-400 hover:text-red-600 px-2 py-1 rounded"
                      title="Delete category"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </nav>

            <div className="mt-6">
              <div className="flex gap-2">
                <input
                  placeholder="Quick add question..."
                  value={addingText}
                  onChange={(e) => setAddingText(e.target.value)}
                  className="flex-1 rounded-md px-3 py-2 border bg-transparent"
                />
                <select value={addingCategory} onChange={(e) => setAddingCategory(e.target.value)} className="rounded-md border px-2 py-2">
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={addQuestion} className="ml-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md">
                  Add
                </button>
              </div>
            </div>

            <div className="mt-6 text-xs text-gray-400">Tip: click category to scroll. Click a question to view its code.</div>
          </aside>

          {/* MAIN */}
          <main className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">Questions</h1>
                <div className="text-sm text-gray-500">Total: {questions.length}</div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search questions..."
                    className="pl-10 pr-4 py-2 rounded-lg border w-80"
                  />
                </div>

                {user ? (
                  <button
                    onClick={() => auth.signOut()}
                    className="flex items-center gap-2 px-3 py-2 rounded-md border text-sm"
                    title="Logout"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const email = prompt("Admin email:");
                      const pwd = prompt("Password:");
                      if (!email || !pwd) return;
                      signInWithEmailAndPassword(auth, email, pwd).catch((err) => {
                        alert("Login failed: " + err.message);
                      });
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 text-white"
                  >
                    <LogIn size={16} /> Admin Login
                  </button>
                )}
              </div>
            </div>

            {/* grouped categories */}
            <div className="space-y-8">
              {grouped.map((g) => (
                <section key={g.name} id={`cat-${g.name}`} ref={(el) => (refs.current[g.name] = el)}>
                  <h2 className="text-lg font-semibold mb-3 text-indigo-600">{g.name} <span className="text-sm text-gray-400 ml-2">({g.items.length})</span></h2>

                  <div className="space-y-3">
                    {g.items.length === 0 && <div className="text-sm text-gray-400">No questions in this category.</div>}

                    {g.items.map((q, idx) => (
                      <div
                        key={q.id}
                        className={`${theme === "dark" ? "bg-gray-800/40" : "bg-white"} rounded-xl p-4 shadow-sm border flex flex-col gap-3 cursor-pointer`}
                        onClick={() => setQuestions((prev) => prev.map((x) => x.id === q.id ? { ...x, showCode: !x.showCode } : x))}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${q.complete ? "bg-green-50" : "bg-gray-50"} border`}>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleComplete(q.id); }}
                                title={q.complete ? "Mark active" : "Mark complete"}
                                className="p-1"
                              >
                                <CheckCircle size={18} color={q.complete ? "#059669" : "#9CA3AF"} />
                              </button>
                            </div>

                            <div>
                              <div className="font-semibold text-sm">{idx + 1}. {q.text}</div>
                              <div className="text-xs text-gray-400 mt-1">{q.id}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openEditQuestionModal(q)}
                              title="Edit question"
                              className="px-2 py-1 rounded text-sm border hover:bg-indigo-50"
                            >
                              <Edit2 size={14} />
                            </button>

                            <button
                              onClick={() => {
                                // open code edit if admin, else just view (clicking card toggles view)
                                if (isAdmin) {
                                  openEditCode(q.id);
                                  // ensure the code area is visible
                                  setQuestions((prev) => prev.map((x) => x.id === q.id ? { ...x, showCode: true } : x));
                                } else {
                                  // just open code viewer
                                  setQuestions((prev) => prev.map((x) => x.id === q.id ? { ...x, showCode: true } : x));
                                }
                              }}
                              title="Edit / View code"
                              className="px-2 py-1 rounded text-sm border hover:bg-indigo-50"
                            >
                              Code
                            </button>

                            {isAdmin && (
                              <button
                                onClick={() => confirmDelete("question", q.id, q.text)}
                                title="Delete question"
                                className="px-2 py-1 rounded text-sm text-red-500 border hover:bg-red-50"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* code area */}
                        {q.showCode && (
                          <div onClick={(e) => e.stopPropagation()} className="mt-2">
                            {!q.editingCode ? (
                              <pre className={`${theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-800"} rounded-md p-3 whitespace-pre-wrap`} style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace" }}>
                                {q.code || "// No code yet. Click 'Code' to add."}
                              </pre>
                            ) : (
                              <div>
                                <textarea
                                  value={q.editingCodeValue}
                                  onChange={(e) => changeEditingCodeValue(q.id, e.target.value)}
                                  rows={8}
                                  className="w-full rounded-md p-3 border"
                                  style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace" }}
                                />
                                <div className="mt-2 flex justify-end gap-2">
                                  <button onClick={() => setQuestions((prev) => prev.map((x) => x.id === q.id ? { ...x, editingCode: false } : x))} className="px-3 py-1 rounded border">Cancel</button>
                                  <button onClick={() => saveCode(q.id)} className="px-3 py-1 rounded bg-indigo-600 text-white">Save Code</button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </main>
        </div>

        {/* footer */}
        <div className="mt-8 text-center text-sm text-gray-500 opacity-70">Built by Mohammad Shoaib Khan</div>
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed right-8 bottom-8 bg-indigo-600 hover:bg-indigo-700 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
        title="Add question"
      >
        <Plus />
      </button>

      {/* Confirm delete modal */}
      {confirmOpen && confirmData && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center">
          <div className={`${theme === "dark" ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900"} rounded-lg p-6 w-96 shadow-lg`}>
            <h3 className="text-lg font-semibold mb-2">Confirm Delete</h3>
            <p className="text-sm text-gray-500 mb-4">Are you sure you want to delete {confirmData.label}? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setConfirmOpen(false); setConfirmData(null); }} className="px-3 py-1 border rounded">Cancel</button>
              <button onClick={() => {
                if (confirmData.type === "question") deleteQuestionConfirmed(confirmData.idOrName || confirmData.idOrName);
                if (confirmData.type === "category") deleteCategoryConfirmed(confirmData.idOrName || confirmData.idOrName);
              }} className="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add question modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center">
          <div className={`${theme === "dark" ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900"} rounded-lg p-6 w-[720px] shadow-lg`}>
            <h3 className="text-lg font-semibold mb-3">Add Question</h3>
            <div className="flex gap-2 mb-3">
              <select value={addingCategory} onChange={(e) => setAddingCategory(e.target.value)} className="rounded-md border p-2">
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={addingText} onChange={(e) => setAddingText(e.target.value)} placeholder="Question text..." className="flex-1 rounded-md border p-2" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="px-3 py-1 border rounded">Cancel</button>
              <button onClick={addQuestion} className="px-3 py-1 bg-indigo-600 text-white rounded">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit question modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center">
          <div className={`${theme === "dark" ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900"} rounded-lg p-6 w-96 shadow-lg`}>
            <h3 className="text-lg font-semibold mb-3">Edit Question</h3>
            <textarea value={editQuestionText} onChange={(e) => setEditQuestionText(e.target.value)} rows={4} className="w-full rounded-md border p-2 mb-3" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditModalOpen(false)} className="px-3 py-1 border rounded">Cancel</button>
              <button onClick={saveEditedQuestion} className="px-3 py-1 bg-indigo-600 text-white rounded">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
