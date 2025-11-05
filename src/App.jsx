import React, { useEffect, useState, useRef } from "react";
import {
  Search,
  CheckCircle,
  Trash2,
  Plus,
  X,
  Edit3,
  Sun,
  Moon,
  Menu,
} from "react-feather";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { oneDark as cmOneDark } from "@codemirror/theme-one-dark";

const ADMIN_EMAIL = "mshoaibkhan0988@gmail.com";

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
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [questions, setQuestions] = useState([]);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [addText, setAddText] = useState("");
  const [addCategory, setAddCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [addCode, setAddCode] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const refs = useRef({});
  const searchRef = useRef(null);

  // Firebase listeners
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAdmin(u?.email === ADMIN_EMAIL);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "questions"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        showCode: false,
      }));
      setQuestions(data);
    });
    return unsub;
  }, []);

  // Theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // CRUD logic
  async function handleAddSave() {
    const text = addText?.trim();
    if (!text) return alert("Question text cannot be empty.");
    await addDoc(collection(db, "questions"), {
      text,
      category: addCategory,
      code: addCode || "",
      complete: false,
    });
    setAddText("");
    setAddCode("");
    setShowAddModal(false);
  }

  async function toggleComplete(id) {
    const q = questions.find((x) => x.id === id);
    if (!q) return;
    await updateDoc(doc(db, "questions", id), { complete: !q.complete });
  }

  async function saveChanges(id, newText, newCode) {
    await updateDoc(doc(db, "questions", id), {
      text: newText,
      code: newCode,
    });
    setQuestions((prev) =>
      prev.map((x) =>
        x.id === id
          ? { ...x, text: newText, code: newCode, editMode: false }
          : x
      )
    );
  }

  async function removeQuestion(id) {
    if (!isAdmin) return alert("Only admin can delete.");
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    await deleteDoc(doc(db, "questions", id));
  }

  function addCategoryLocal() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) return alert("Category already exists.");
    setCategories([...categories, trimmed]);
    setNewCategory("");
  }

  async function deleteCategory(cat) {
    if (!isAdmin) return alert("Only admin can delete categories.");
    if (!window.confirm(`Delete category "${cat}"?`)) return;
    setCategories((prev) => prev.filter((c) => c !== cat));
    questions
      .filter((q) => q.category === cat)
      .forEach((q) => deleteDoc(doc(db, "questions", q.id)));
  }

  async function handleLogin(e) {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail("");
      setPassword("");
      setShowLogin(false);
    } catch (err) {
      alert("Login failed: " + err.message);
    }
  }

  async function handleLogout() {
    await signOut(auth);
  }

  const grouped = categories.map((c, idx) => ({
    category: `${idx + 1}. ${c}`,
    items: questions
      .filter(
        (q) =>
          q.category?.toLowerCase() === c.toLowerCase() &&
          q.text.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.text.localeCompare(b.text)),
  }));

  function toggleCodeVisibility(id) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, showCode: !q.showCode } : q
      )
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-all duration-300">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between bg-white dark:bg-gray-800 shadow p-3 sticky top-0 z-40">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Menu />
        </button>
        <h1 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
          Study Tracker
        </h1>
        <button
          onClick={() => setDarkMode((prev) => !prev)}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`bg-white dark:bg-gray-800 shadow-md p-4 flex flex-col justify-between z-50 transform transition-transform duration-300
          md:fixed md:inset-y-0 md:left-0 md:w-64
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div>
          <div className="hidden md:flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
              Study Tracker
            </h2>
            <button
              onClick={() => setDarkMode((prev) => !prev)}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <div className="flex md:hidden justify-end mb-3">
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-300"
            >
              <X />
            </button>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase">
              Categories
            </h3>
            <button
              onClick={addCategoryLocal}
              className="text-indigo-500 hover:text-indigo-700"
            >
              <Plus size={16} />
            </button>
          </div>

          <input
            type="text"
            placeholder="New category..."
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded mb-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
          />

          <ul className="space-y-1 overflow-y-auto max-h-[60vh]">
            {categories.map((c, i) => (
              <li
                key={i}
                className="flex justify-between items-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md px-2 py-1 cursor-pointer"
                onClick={() => {
                  refs.current[c]?.scrollIntoView({ behavior: "smooth" });
                  setSidebarOpen(false);
                }}
              >
                <span>
                  {i + 1}. {c}
                </span>
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCategory(c);
                    }}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 md:mt-auto">
          {user ? (
            <button
              onClick={handleLogout}
              className="w-full py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-md"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => {
                setShowLogin(true);
                setSidebarOpen(false);
              }}
              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-md"
            >
              Admin Login
            </button>
          )}
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 sm:p-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
            Questions List
          </h1>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md pl-8 pr-3 py-1.5 text-sm w-full sm:w-64 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {grouped.map((g) => (
          <section
            key={g.category}
            ref={(el) => (refs.current[g.category.split(". ")[1]] = el)}
            className="mb-8"
          >
            <h3 className="text-lg sm:text-xl font-semibold text-indigo-700 dark:text-indigo-400 mb-3">
              {g.category}
            </h3>
            <ul className="space-y-3">
              {g.items.map((q, i) => (
                <li
                  key={q.id}
                  className="bg-white dark:bg-gray-800 shadow p-3 rounded-md border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  <div
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 cursor-pointer"
                    onClick={() => toggleCodeVisibility(q.id)}
                  >
                    <div className="flex items-start sm:items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComplete(q.id);
                        }}
                        className="mt-0.5"
                      >
                        <CheckCircle
                          size={18}
                          className={`transition-colors ${
                            q.complete ? "text-green-600" : "text-gray-400"
                          }`}
                        />
                      </button>
                      <span className="font-medium break-words max-w-full">
                        {i + 1}. {q.text}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-0">
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuestions((prev) =>
                              prev.map((x) =>
                                x.id === q.id
                                  ? {
                                      ...x,
                                      editMode: !x.editMode,
                                      showCode: true,
                                    }
                                  : x
                              )
                            );
                          }}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          <Edit3 size={16} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeQuestion(q.id);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {q.showCode && (
                    <div className="mt-3 border border-gray-200 dark:border-gray-600 rounded-md p-3 bg-gray-50 dark:bg-gray-900 overflow-x-auto whitespace-pre-wrap">
                      {isAdmin && q.editMode ? (
                        <div className="space-y-3">
                          <textarea
                            value={q.localText ?? q.text}
                            onChange={(e) =>
                              setQuestions((prev) =>
                                prev.map((x) =>
                                  x.id === q.id
                                    ? { ...x, localText: e.target.value }
                                    : x
                                )
                              )
                            }
                            placeholder="Enter question text..."
                            className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
                          />
                          <CodeMirror
                            value={q.localCode ?? q.code}
                            height="200px"
                            theme={darkMode ? cmOneDark : "light"}
                            extensions={[cpp()]}
                            onChange={(value) =>
                              setQuestions((prev) =>
                                prev.map((x) =>
                                  x.id === q.id
                                    ? { ...x, localCode: value }
                                    : x
                                )
                              )
                            }
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() =>
                                saveChanges(
                                  q.id,
                                  q.localText ?? q.text,
                                  q.localCode ?? q.code
                                )
                              }
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() =>
                                setQuestions((prev) =>
                                  prev.map((x) =>
                                    x.id === q.id
                                      ? {
                                          ...x,
                                          editMode: false,
                                          localText: "",
                                          localCode: "",
                                        }
                                      : x
                                  )
                                )
                              }
                              className="px-3 py-1 border rounded-md text-sm text-gray-700 dark:text-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <SyntaxHighlighter
                          language="c"
                          style={oneDark}
                          className="rounded-md text-sm whitespace-pre-wrap"
                        >
                          {q.code || "// No code added yet"}
                        </SyntaxHighlighter>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <button
          className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg z-50"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={20} />
        </button>
      </main>

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Add New Question
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300"
              >
                <X />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300 block mb-1">
                  Category
                </label>
                <select
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700"
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300 block mb-1">
                  Question
                </label>
                <textarea
                  value={addText}
                  onChange={(e) => setAddText(e.target.value)}
                  placeholder="Enter question text..."
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300 block mb-1">
                  Optional Code
                </label>
                <CodeMirror
                  value={addCode}
                  height="200px"
                  theme={darkMode ? cmOneDark : "light"}
                  extensions={[cpp()]}
                  onChange={(value) => setAddCode(value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-md text-sm text-gray-700 dark:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSave}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-gray-500 opacity-60 text-sm py-4 mt-auto">
        Built by Mohammad Shoaib Khan
      </footer>
    </div>
  );
}
