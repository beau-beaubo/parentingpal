const API_BASE = "/api";

function $(sel) {
  return document.querySelector(sel);
}

function setupModals() {
  const openButtons = document.querySelectorAll("[data-open-modal]");
  const closeButtons = document.querySelectorAll("[data-close-modal]");

  function openModal(key) {
    const modal = document.querySelector(`[data-modal="${CSS.escape(key)}"]`);
    if (!modal) return;
    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  }

  function closeModal(key) {
    const modal = document.querySelector(`[data-modal="${CSS.escape(key)}"]`);
    if (!modal) return;
    modal.classList.add("hidden");
    // Only remove overflow lock if all modals are closed.
    const anyOpen = document.querySelector("[data-modal]:not(.hidden)");
    if (!anyOpen) document.body.classList.remove("overflow-hidden");
  }

  openButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-open-modal");
      if (key) openModal(key);
    });
  });

  closeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-close-modal");
      if (key) closeModal(key);
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    // Close the most recently opened modal (best-effort: close any open).
    const openModalEl = document.querySelector("[data-modal]:not(.hidden)");
    if (!openModalEl) return;
    const key = openModalEl.getAttribute("data-modal");
    if (key) closeModal(key);
  });
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getToken() {
  return localStorage.getItem("pp_access");
}

function setToken(access, refresh) {
  localStorage.setItem("pp_access", access);
  if (refresh) localStorage.setItem("pp_refresh", refresh);
}

function clearToken() {
  localStorage.removeItem("pp_access");
  localStorage.removeItem("pp_refresh");
}

async function apiFetch(path, { method = "GET", body = undefined } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // If a JWT token is present but the API says 401, force logout.
  // NOTE: Don't auto-redirect on login failures (no token yet).
  if (res.status === 401 && token) {
    clearToken();
    window.location.href = "/app/login/";
    throw new Error("Unauthorized (401). Please login again.");
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_err) {
      // Fallback for non-JSON responses (e.g., HTML error pages).
      data = { detail: text.slice(0, 200) };
    }
  }

  if (!res.ok) {
    const detail = data?.detail || `Request failed (${res.status})`;
    throw new Error(detail);
  }

  return data;
}

function renderMessage(el, type, message) {
  if (!el) return;
  const base = "rounded-xl px-4 py-3";
  const cls =
    type === "success"
      ? `${base} border border-emerald-200 bg-emerald-50 text-emerald-800`
      : type === "error"
        ? `${base} border border-rose-200 bg-rose-50 text-rose-800`
        : `${base} border border-slate-200 bg-white text-slate-800`;
  el.className = cls;
  el.textContent = message;
  el.hidden = !message;
}

function statusPill(status) {
  const s = String(status || "").toLowerCase();
  const label = s || "unknown";

  const base = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold";
  const cls =
    s === "assigned"
      ? `${base} border-amber-200 bg-amber-50 text-amber-800`
      : s === "submitted"
        ? `${base} border-sky-200 bg-sky-50 text-sky-800`
        : s === "checked"
          ? `${base} border-emerald-200 bg-emerald-50 text-emerald-800`
          : `${base} border-slate-200 bg-slate-50 text-slate-700`;

  const icon = s === "assigned" ? "•" : s === "submitted" ? "↑" : s === "checked" ? "✓" : "?";
  return `<span class="${cls}"><span aria-hidden="true">${escapeHtml(icon)}</span><span>${escapeHtml(label)}</span></span>`;
}

async function loadMe() {
  return await apiFetch("/auth/me/");
}

function requireRole(me, role) {
  if (!me || me.role !== role) {
    throw new Error(`This page requires role=${role}.`);
  }
}

function setupLogoutButtons() {
  function bind(btn) {
    if (!btn) return;
    if (btn.dataset.ppLogoutBound === "1") return;
    btn.dataset.ppLogoutBound = "1";
    btn.addEventListener("click", () => {
      clearToken();
      window.location.href = "/app/login/";
    });
  }

  ["#logout", "#logoutDesktop", "#logoutDrawer"].forEach((sel) => bind($(sel)));
}

function setupHeader(me) {
  const displayName = me ? (me.full_name || me.email) : "";
  const meText = me ? `${displayName} (${me.role})` : "";
  ["#me", "#meDesktop"].forEach((sel) => {
    const el = $(sel);
    if (el) el.textContent = meText;
  });

  // Keep logout working even if a page fails auth/role checks.
  setupLogoutButtons();
}

function closeModal(key) {
  const modal = document.querySelector(`[data-modal="${CSS.escape(key)}"]`);
  if (!modal) return;
  modal.classList.add("hidden");
  const anyOpen = document.querySelector("[data-modal]:not(.hidden)");
  if (!anyOpen) document.body.classList.remove("overflow-hidden");
}

async function pageLogin() {
  const msg = $("#msg");
  const form = $("#loginForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    renderMessage(msg, "", "");

    const email = $("#email").value.trim();
    const password = $("#password").value;

    try {
      const tokens = await apiFetch("/auth/token/", {
        method: "POST",
        body: { email, password },
      });
      setToken(tokens.access, tokens.refresh);

      const me = await loadMe();
      if (me.role === "teacher") window.location.href = "/app/teacher/";
      else if (me.role === "parent") window.location.href = "/app/parent/";
      else if (me.role === "admin") window.location.href = "/app/admin/";
      else throw new Error("Unknown role");
    } catch (err) {
      renderMessage(msg, "error", err.message || String(err));
    }
  });
}

async function pageAdminTab(pageKey) {
  const msg = $("#msg");
  try {
    const me = await loadMe();
    requireRole(me, "admin");
    setupHeader(me);

    if (pageKey === "admin" || pageKey === "admin-overview") {
      return;
    }
    if (pageKey === "admin-users") {
      await setupAdminUsers(msg);
      return;
    }
    if (pageKey === "admin-classes") {
      await setupAdminClasses(msg);
      return;
    }
    if (pageKey === "admin-students") {
      await setupAdminStudents(msg);
      return;
    }
    if (pageKey === "admin-links") {
      await setupAdminLinks(msg);
      return;
    }
  } catch (err) {
    renderMessage(msg, "error", err.message || String(err));
  }
}

async function setupAdminUsers(msg) {
  const loadBtn = $("#adminUsersLoad");
  const listRoot = $("#adminUsersList");
  const form = $("#adminUserCreateForm");
  if (!listRoot || !loadBtn || !form) return;

  async function loadUsers() {
    listRoot.innerHTML = "<div class='text-sm text-slate-600'>Loading…</div>";
    let users;
    try {
      users = await apiFetch("/admin/users/");
    } catch (err) {
      const msgText = err?.message || String(err);
      listRoot.innerHTML = `<div class='text-sm text-rose-700'>Failed to load users: ${escapeHtml(msgText)}</div>`;
      throw err;
    }
    if (!users.length) {
      listRoot.innerHTML = "<div class='text-sm text-slate-600'>No users found.</div>";
      return;
    }

    const rolesInOrder = ["admin", "teacher", "parent"];
    const groups = Object.fromEntries(rolesInOrder.map((r) => [r, []]));
    users.forEach((u) => {
      const r = String(u.role || "").toLowerCase();
      if (!groups[r]) groups[r] = [];
      groups[r].push(u);
    });

    listRoot.innerHTML = rolesInOrder
      .map((roleKey) => {
        const items = groups[roleKey] || [];
        const title = roleKey.charAt(0).toUpperCase() + roleKey.slice(1);
        const body = items.length
          ? items
              .map((u) => {
                const safeName = escapeHtml(u.full_name || "(no name)");
                const safeEmail = escapeHtml(u.email);
                const safeRole = escapeHtml(u.role);
                return `
                  <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm" data-admin-user-card="${u.id}">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <div class="truncate text-sm font-semibold text-slate-900">${safeName}</div>
                        <div class="mt-0.5 truncate text-xs text-slate-600">${safeEmail} • role: ${safeRole}</div>
                      </div>
                      <div class="flex shrink-0 flex-col gap-2 sm:flex-row">
                        <button type="button" class="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-user-edit="${u.id}">
                          Update
                        </button>
                        <button type="button" class="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm ring-1 ring-rose-200 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300" data-admin-user-delete="${u.id}">
                          Delete
                        </button>
                      </div>
                    </div>

                    <div class="mt-4 hidden" data-admin-user-edit-panel="${u.id}">
                      <div class="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label class="block text-sm font-medium text-slate-700">Email</label>
                          <input type="email" value="${safeEmail}" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-user-edit-email="${u.id}" />
                        </div>
                        <div>
                          <label class="block text-sm font-medium text-slate-700">Full name</label>
                          <input type="text" value="${safeName}" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-user-edit-name="${u.id}" />
                        </div>
                        <div>
                          <label class="block text-sm font-medium text-slate-700">Role</label>
                          <select class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-user-edit-role="${u.id}">
                            <option value="admin" ${u.role === "admin" ? "selected" : ""}>admin</option>
                            <option value="teacher" ${u.role === "teacher" ? "selected" : ""}>teacher</option>
                            <option value="parent" ${u.role === "parent" ? "selected" : ""}>parent</option>
                          </select>
                        </div>
                        <div>
                          <label class="block text-sm font-medium text-slate-700">New password (optional)</label>
                          <input type="password" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-user-edit-password="${u.id}" />
                        </div>
                      </div>

                      <div class="mt-4 flex flex-col gap-2 sm:flex-row">
                        <button type="button" class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-user-save="${u.id}">Save</button>
                        <button type="button" class="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-user-cancel="${u.id}">Cancel</button>
                      </div>
                    </div>
                  </div>
                `;
              })
              .join("")
          : `<div class="text-sm text-slate-600">No ${escapeHtml(roleKey)} users.</div>`;

        return `
          <div class="mt-4">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">${escapeHtml(title)}</div>
            <div class="space-y-2">${body}</div>
          </div>
        `;
      })
      .join("");

    listRoot.querySelectorAll("[data-admin-user-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-admin-user-edit");
        const panel = listRoot.querySelector(`[data-admin-user-edit-panel="${id}"]`);
        if (!panel) return;
        panel.classList.toggle("hidden");
      });
    });

    listRoot.querySelectorAll("[data-admin-user-cancel]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-admin-user-cancel");
        const panel = listRoot.querySelector(`[data-admin-user-edit-panel="${id}"]`);
        if (!panel) return;
        panel.classList.add("hidden");
      });
    });

    listRoot.querySelectorAll("[data-admin-user-save]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-admin-user-save");
        const email = listRoot.querySelector(`[data-admin-user-edit-email="${id}"]`)?.value?.trim() || "";
        const name = listRoot.querySelector(`[data-admin-user-edit-name="${id}"]`)?.value?.trim() || "";
        const role = listRoot.querySelector(`[data-admin-user-edit-role="${id}"]`)?.value || "parent";
        const passwordRaw = listRoot.querySelector(`[data-admin-user-edit-password="${id}"]`)?.value || "";
        const password = passwordRaw.trim();

        const body = { email, full_name: name, role };
        if (password) body.password = password;

        try {
          await apiFetch(`/admin/users/${id}/`, { method: "PATCH", body });
          const pw = listRoot.querySelector(`[data-admin-user-edit-password="${id}"]`);
          if (pw) pw.value = "";
          renderMessage(msg, "success", "User updated.");
          await loadUsers();
        } catch (err) {
          renderMessage(msg, "error", err.message || String(err));
        }
      });
    });

    listRoot.querySelectorAll("[data-admin-user-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-admin-user-delete");
        try {
          await apiFetch(`/admin/users/${id}/`, { method: "DELETE" });
          await loadUsers();
        } catch (err) {
          renderMessage(msg, "error", err.message || String(err));
        }
      });
    });
  }

  loadBtn.addEventListener("click", async () => {
    renderMessage(msg, "", "");
    try {
      await loadUsers();
    } catch (err) {
      renderMessage(msg, "error", err.message || String(err));
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    renderMessage(msg, "", "");

    const email = $("#auEmail").value.trim();
    const full_name = $("#auName").value.trim();
    const role = $("#auRole").value;
    const password = $("#auPassword").value;
    const body = { email, full_name, role };
    if (password) body.password = password;

    try {
      await apiFetch("/admin/users/", { method: "POST", body });
      $("#auEmail").value = "";
      $("#auName").value = "";
      $("#auPassword").value = "";
      renderMessage(msg, "success", "User created.");
      closeModal("admin-user-create");
      try {
        await loadUsers();
      } catch (_err) {
        // If list load fails, the list area will show the reason.
      }
    } catch (err) {
      renderMessage(msg, "error", err.message || String(err));
    }
  });

  // Auto-load on page open.
  try {
    await loadUsers();
  } catch (err) {
    renderMessage(msg, "error", err.message || String(err));
  }
}

async function setupAdminClasses(msg) {
  const loadBtn = $("#adminClassesLoad");
  const listRoot = $("#adminClassesList");
  const form = $("#adminClassCreateForm");
  const teacherSelect = $("#acTeacher");
  if (!listRoot || !loadBtn || !form || !teacherSelect) return;

  let cachedTeachers = [];

  async function loadTeachers() {
    const users = await apiFetch("/admin/users/");
    const teachers = users.filter((u) => u.role === "teacher");
    cachedTeachers = teachers;
    teacherSelect.innerHTML = teachers
      .map((t) => `<option value="${t.id}">${escapeHtml(t.full_name || t.email)}</option>`)
      .join("");
    if (!teachers.length) {
      teacherSelect.innerHTML = "";
      throw new Error("No teacher users found. Create a teacher first in Admin → Users.");
    }
  }

  async function loadClasses() {
    listRoot.innerHTML = "<div class='text-sm text-slate-600'>Loading…</div>";
    const classes = await apiFetch("/admin/classes/");
    if (!classes.length) {
      listRoot.innerHTML = "<div class='text-sm text-slate-600'>No classes found.</div>";
      return;
    }

    listRoot.innerHTML = classes
      .map(
        (c) => `
          <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-sm font-semibold text-slate-900">${escapeHtml(c.name)}</div>
                <div class="mt-0.5 text-xs text-slate-600">Teacher: ${escapeHtml(c.teacher_name || c.teacher_email || String(c.teacher))}</div>
              </div>
              <div class="flex shrink-0 flex-col gap-2 sm:flex-row">
                <button type="button" class="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-class-edit="${c.id}">Update</button>
                <button type="button" class="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm ring-1 ring-rose-200 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300" data-admin-class-delete="${c.id}">Delete</button>
              </div>
            </div>

            <div class="mt-4 hidden" data-admin-class-edit-panel="${c.id}">
              <div class="grid gap-3 sm:grid-cols-2">
                <div>
                  <label class="block text-sm font-medium text-slate-700">Class name</label>
                  <input type="text" value="${escapeHtml(c.name)}" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-class-edit-name="${c.id}" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700">Teacher</label>
                  <select class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-class-edit-teacher="${c.id}">
                    ${cachedTeachers
                      .map(
                        (t) =>
                          `<option value="${t.id}" ${String(t.id) === String(c.teacher) ? "selected" : ""}>${escapeHtml(t.full_name || t.email)}</option>`
                      )
                      .join("")}
                  </select>
                </div>
              </div>

              <div class="mt-4 flex flex-col gap-2 sm:flex-row">
                <button type="button" class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-class-save="${c.id}">Save</button>
                <button type="button" class="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-class-cancel="${c.id}">Cancel</button>
              </div>
            </div>
          </div>
        `
      )
      .join("");

    listRoot.querySelectorAll("[data-admin-class-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-admin-class-edit");
        const panel = listRoot.querySelector(`[data-admin-class-edit-panel="${id}"]`);
        if (!panel) return;
        panel.classList.toggle("hidden");
      });
    });

    listRoot.querySelectorAll("[data-admin-class-cancel]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-admin-class-cancel");
        const panel = listRoot.querySelector(`[data-admin-class-edit-panel="${id}"]`);
        if (!panel) return;
        panel.classList.add("hidden");
      });
    });

    listRoot.querySelectorAll("[data-admin-class-save]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-admin-class-save");
        const name = listRoot.querySelector(`[data-admin-class-edit-name="${id}"]`)?.value?.trim() || "";
        const teacher = Number(listRoot.querySelector(`[data-admin-class-edit-teacher="${id}"]`)?.value);

        try {
          await apiFetch(`/admin/classes/${id}/`, { method: "PATCH", body: { name, teacher } });
          renderMessage(msg, "success", "Class updated.");
          await loadClasses();
        } catch (err) {
          renderMessage(msg, "error", err.message || String(err));
        }
      });
    });

    listRoot.querySelectorAll("[data-admin-class-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-admin-class-delete");
        try {
          await apiFetch(`/admin/classes/${id}/`, { method: "DELETE" });
          await loadClasses();
        } catch (err) {
          renderMessage(msg, "error", err.message || String(err));
        }
      });
    });
  }

  try {
    await loadTeachers();
  } catch (err) {
    renderMessage(msg, "error", err.message || String(err));
  }

  loadBtn.addEventListener("click", async () => {
    renderMessage(msg, "", "");
    try {
      await loadClasses();
    } catch (err) {
      renderMessage(msg, "error", err.message || String(err));
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    renderMessage(msg, "", "");

    const name = $("#acName").value.trim();
    const teacher = Number($("#acTeacher").value);

    try {
      await apiFetch("/admin/classes/", { method: "POST", body: { name, teacher } });
      $("#acName").value = "";
      renderMessage(msg, "success", "Class created.");
      closeModal("admin-class-create");
      try {
        await loadClasses();
      } catch (_err) {
        // list area will show the reason if it fails
      }
    } catch (err) {
      renderMessage(msg, "error", err.message || String(err));
    }
  });

  // Auto-load on page open.
  try {
    await loadClasses();
  } catch (err) {
    renderMessage(msg, "error", err.message || String(err));
  }
}

async function setupAdminStudents(msg) {
  const loadBtn = $("#adminStudentsLoad");
  const listRoot = $("#adminStudentsList");
  const form = $("#adminStudentCreateForm");
  const classSelect = $("#asClass");
  const filterSelect = $("#adminStudentFilterClass");
  if (!listRoot || !loadBtn || !form || !classSelect || !filterSelect) return;

  let hasLoadedOnce = false;

  async function loadClassesIntoSelect() {
    const classes = await apiFetch("/admin/classes/");
    classSelect.innerHTML = classes.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
    filterSelect.innerHTML = [
      `<option value="">All classes</option>`,
      ...classes.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`),
    ].join("");
    if (!classes.length) {
      classSelect.innerHTML = "";
      filterSelect.innerHTML = "";
      throw new Error("No classes found. Create a class first.");
    }
  }

  async function loadStudents() {
    listRoot.innerHTML = "<div class='text-sm text-slate-600'>Loading…</div>";
    const classId = filterSelect.value;
    const qs = classId ? `?class_id=${encodeURIComponent(classId)}` : "";
    const students = await apiFetch(`/admin/students/${qs}`);
    if (!students.length) {
      listRoot.innerHTML = "<div class='text-sm text-slate-600'>No students found.</div>";
      return;
    }

    listRoot.innerHTML = students
      .map(
        (s) => `
          <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-sm font-semibold text-slate-900">${escapeHtml(s.full_name)}</div>
                <div class="mt-0.5 text-xs text-slate-600">Class: ${escapeHtml(s.school_class_name || String(s.school_class))}</div>
              </div>
              <div class="flex shrink-0 flex-col gap-2 sm:flex-row">
                <button type="button" class="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-student-edit="${s.id}">Update</button>
                <button type="button" class="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm ring-1 ring-rose-200 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300" data-admin-student-delete="${s.id}">Delete</button>
              </div>
            </div>

            <div class="mt-4 hidden" data-admin-student-edit-panel="${s.id}">
              <div class="grid gap-3 sm:grid-cols-2">
                <div>
                  <label class="block text-sm font-medium text-slate-700">Student full name</label>
                  <input type="text" value="${escapeHtml(s.full_name)}" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-student-edit-name="${s.id}" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700">Class</label>
                  <select class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-student-edit-class="${s.id}">
                    ${Array.from(classSelect.options)
                      .map(
                        (opt) =>
                          `<option value="${escapeHtml(opt.value)}" ${String(opt.value) === String(s.school_class) ? "selected" : ""}>${escapeHtml(opt.textContent)}</option>`
                      )
                      .join("")}
                  </select>
                </div>
              </div>

              <div class="mt-4 flex flex-col gap-2 sm:flex-row">
                <button type="button" class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-student-save="${s.id}">Save</button>
                <button type="button" class="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-student-cancel="${s.id}">Cancel</button>
              </div>
            </div>
          </div>
        `
      )
      .join("");

    listRoot.querySelectorAll("[data-admin-student-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-admin-student-edit");
        const panel = listRoot.querySelector(`[data-admin-student-edit-panel="${id}"]`);
        if (!panel) return;
        panel.classList.toggle("hidden");
      });
    });

    listRoot.querySelectorAll("[data-admin-student-cancel]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-admin-student-cancel");
        const panel = listRoot.querySelector(`[data-admin-student-edit-panel="${id}"]`);
        if (!panel) return;
        panel.classList.add("hidden");
      });
    });

    listRoot.querySelectorAll("[data-admin-student-save]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-admin-student-save");
        const full_name = listRoot.querySelector(`[data-admin-student-edit-name="${id}"]`)?.value?.trim() || "";
        const school_class = Number(listRoot.querySelector(`[data-admin-student-edit-class="${id}"]`)?.value);

        try {
          await apiFetch(`/admin/students/${id}/`, { method: "PATCH", body: { full_name, school_class } });
          renderMessage(msg, "success", "Student updated.");
          await loadStudents();
        } catch (err) {
          renderMessage(msg, "error", err.message || String(err));
        }
      });
    });

    listRoot.querySelectorAll("[data-admin-student-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-admin-student-delete");
        try {
          await apiFetch(`/admin/students/${id}/`, { method: "DELETE" });
          await loadStudents();
        } catch (err) {
          renderMessage(msg, "error", err.message || String(err));
        }
      });
    });
  }

  try {
    await loadClassesIntoSelect();
  } catch (err) {
    renderMessage(msg, "error", err.message || String(err));
  }

  loadBtn.addEventListener("click", async () => {
    renderMessage(msg, "", "");
    try {
      hasLoadedOnce = true;
      await loadStudents();
    } catch (err) {
      renderMessage(msg, "error", err.message || String(err));
    }
  });

  filterSelect.addEventListener("change", async () => {
    renderMessage(msg, "", "");
    try {
      // Auto-reload on filter change. Also supports first-load without clicking "Load".
      hasLoadedOnce = true;
      await loadStudents();
    } catch (err) {
      renderMessage(msg, "error", err.message || String(err));
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    renderMessage(msg, "", "");

    const full_name = $("#asName").value.trim();
    const school_class = Number($("#asClass").value);

    try {
      await apiFetch("/admin/students/", { method: "POST", body: { full_name, school_class } });
      $("#asName").value = "";
      renderMessage(msg, "success", "Student created.");
      closeModal("admin-student-create");
      try {
        await loadStudents();
      } catch (_err) {
        // list area will show the reason if it fails
      }
    } catch (err) {
      renderMessage(msg, "error", err.message || String(err));
    }
  });

  // Auto-load on page open.
  try {
    hasLoadedOnce = true;
    await loadStudents();
  } catch (err) {
    renderMessage(msg, "error", err.message || String(err));
  }
}

async function setupAdminLinks(msg) {
  const loadBtn = $("#adminLinksLoad");
  const listRoot = $("#adminLinksList");
  const form = $("#adminLinkCreateForm");
  const parentSelect = $("#alParent");
  const studentSelect = $("#alStudent");
  if (!listRoot || !loadBtn || !form || !parentSelect || !studentSelect) return;

  async function loadParentsAndStudents() {
    const [users, students] = await Promise.all([apiFetch("/admin/users/"), apiFetch("/admin/students/")]);
    const parents = users.filter((u) => u.role === "parent");
    parentSelect.innerHTML = parents.map((p) => `<option value="${p.id}">${escapeHtml(p.full_name || p.email)}</option>`).join("");
    studentSelect.innerHTML = students.map((s) => `<option value="${s.id}">${escapeHtml(s.full_name)}</option>`).join("");
    if (!parents.length) throw new Error("No parent users found. Create a parent first (or register one).");
    if (!students.length) throw new Error("No students found. Create a student first.");
  }

  async function loadLinks() {
    listRoot.innerHTML = "<div class='text-sm text-slate-600'>Loading…</div>";
    const links = await apiFetch("/admin/parent-students/");
    if (!links.length) {
      listRoot.innerHTML = "<div class='text-sm text-slate-600'>No links found.</div>";
      return;
    }

    listRoot.innerHTML = links
      .map((l) => {
        const parentName = l.parent_name || l.parent_email || `Parent #${l.parent}`;
        const studentName = l.student_name || `Student #${l.student}`;
        const classText = l.student_class_name ? ` • Class: ${escapeHtml(l.student_class_name)}` : "";

        return `
          <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 text-sm text-slate-900"><span class="font-semibold">${escapeHtml(parentName)}</span> is parent of <span class="font-semibold">${escapeHtml(studentName)}</span>${classText}</div>
              <div class="flex shrink-0 flex-col gap-2 sm:flex-row">
                <button type="button" class="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-link-edit="${l.id}" data-admin-link-parent="${l.parent}" data-admin-link-student="${l.student}">Update</button>
                <button type="button" class="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm ring-1 ring-rose-200 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300" data-admin-link-delete="${l.id}">Delete</button>
              </div>
            </div>

            <div class="mt-4 hidden" data-admin-link-edit-panel="${l.id}">
              <div class="grid gap-3 sm:grid-cols-2">
                <div>
                  <label class="block text-sm font-medium text-slate-700">Parent</label>
                  <select class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-link-edit-parent="${l.id}"></select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700">Student</label>
                  <select class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-link-edit-student="${l.id}"></select>
                </div>
              </div>

              <div class="mt-4 flex flex-col gap-2 sm:flex-row">
                <button type="button" class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-link-save="${l.id}">Save</button>
                <button type="button" class="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" data-admin-link-cancel="${l.id}">Cancel</button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    const [users, students] = await Promise.all([apiFetch("/admin/users/"), apiFetch("/admin/students/")]);
    const parents = users.filter((u) => u.role === "parent");

    function renderParentOptions(selectedId) {
      return parents
        .map(
          (p) =>
            `<option value="${p.id}" ${String(p.id) === String(selectedId) ? "selected" : ""}>${escapeHtml(p.full_name || p.email)}</option>`
        )
        .join("");
    }

    function renderStudentOptions(selectedId) {
      return students
        .map(
          (s) =>
            `<option value="${s.id}" ${String(s.id) === String(selectedId) ? "selected" : ""}>${escapeHtml(s.full_name)}</option>`
        )
        .join("");
    }

    listRoot.querySelectorAll("[data-admin-link-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-admin-link-edit");
        const panel = listRoot.querySelector(`[data-admin-link-edit-panel="${id}"]`);
        if (!panel) return;

        const currentParent = btn.getAttribute("data-admin-link-parent");
        const currentStudent = btn.getAttribute("data-admin-link-student");

        const parentSel = listRoot.querySelector(`[data-admin-link-edit-parent="${id}"]`);
        const studentSel = listRoot.querySelector(`[data-admin-link-edit-student="${id}"]`);
        if (parentSel) parentSel.innerHTML = renderParentOptions(currentParent);
        if (studentSel) studentSel.innerHTML = renderStudentOptions(currentStudent);

        panel.classList.toggle("hidden");
      });
    });

    listRoot.querySelectorAll("[data-admin-link-cancel]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-admin-link-cancel");
        const panel = listRoot.querySelector(`[data-admin-link-edit-panel="${id}"]`);
        if (!panel) return;
        panel.classList.add("hidden");
      });
    });

    listRoot.querySelectorAll("[data-admin-link-save]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-admin-link-save");
        const parent = Number(listRoot.querySelector(`[data-admin-link-edit-parent="${id}"]`)?.value);
        const student = Number(listRoot.querySelector(`[data-admin-link-edit-student="${id}"]`)?.value);

        try {
          await apiFetch(`/admin/parent-students/${id}/`, { method: "PATCH", body: { parent, student } });
          renderMessage(msg, "success", "Link updated.");
          await loadLinks();
        } catch (err) {
          renderMessage(msg, "error", err.message || String(err));
        }
      });
    });

    listRoot.querySelectorAll("[data-admin-link-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-admin-link-delete");
        try {
          await apiFetch(`/admin/parent-students/${id}/`, { method: "DELETE" });
          await loadLinks();
        } catch (err) {
          renderMessage(msg, "error", err.message || String(err));
        }
      });
    });
  }

  try {
    await loadParentsAndStudents();
  } catch (err) {
    renderMessage(msg, "error", err.message || String(err));
  }

  loadBtn.addEventListener("click", async () => {
    renderMessage(msg, "", "");
    try {
      await loadLinks();
    } catch (err) {
      renderMessage(msg, "error", err.message || String(err));
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    renderMessage(msg, "", "");

    const parent = Number($("#alParent").value);
    const student = Number($("#alStudent").value);

    try {
      await apiFetch("/admin/parent-students/", { method: "POST", body: { parent, student } });
      renderMessage(msg, "success", "Link created.");
      closeModal("admin-link-create");
      try {
        await loadLinks();
      } catch (_err) {
        // list area will show the reason if it fails
      }
    } catch (err) {
      renderMessage(msg, "error", err.message || String(err));
    }
  });

  // Auto-load on page open.
  try {
    await loadLinks();
  } catch (err) {
    renderMessage(msg, "error", err.message || String(err));
  }
}

async function pageRegister() {
  const msg = $("#msg");
  const form = $("#registerForm");
  if (!form) return;

  const classSelect = $("#regClassSelect");
  const studentList = $("#studentList");
  const selectedCount = $("#selectedCount");

  function updateSelectedCount() {
    if (!selectedCount) return;
    const checked = document.querySelectorAll("#studentList input[type='checkbox']:checked").length;
    selectedCount.textContent = `Selected: ${checked}`;
  }

  async function loadRegisterClasses() {
    if (!classSelect) return;
    const classes = await apiFetch("/public/classes/");
    classSelect.innerHTML = [
      `<option value="">All classes</option>`,
      ...classes.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`),
    ].join("");
  }

  async function loadRegisterStudents() {
    if (!studentList) return;
    studentList.innerHTML = "<div class='text-sm text-slate-600'>Loading students…</div>";

    const classId = classSelect ? classSelect.value : "";
    const qs = classId ? `?class_id=${encodeURIComponent(classId)}` : "";
    const students = await apiFetch(`/public/students/${qs}`);

    if (!students.length) {
      studentList.innerHTML = "<div class='text-sm text-slate-600'>No students found.</div>";
      updateSelectedCount();
      return;
    }

    studentList.innerHTML = students
      .map(
        (s) => `
        <label class="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <input type="checkbox" value="${s.id}" class="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400" />
          <span class="min-w-0">
            <span class="block truncate text-sm font-semibold text-slate-900">${escapeHtml(s.full_name)}</span>
            <span class="mt-0.5 block text-xs text-slate-600">Class: ${escapeHtml(s.class_name)}</span>
          </span>
        </label>
      `
      )
      .join("");

    studentList.querySelectorAll("input[type='checkbox']").forEach((cb) => cb.addEventListener("change", updateSelectedCount));
    updateSelectedCount();
  }

  // Initial load
  try {
    await loadRegisterClasses();
    await loadRegisterStudents();
    if (classSelect) classSelect.addEventListener("change", loadRegisterStudents);
  } catch (err) {
    renderMessage(msg, "error", err.message || String(err));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    renderMessage(msg, "", "");

    const full_name = $("#fullName").value.trim();
    const email = $("#email").value.trim();
    const password = $("#password").value;

    const student_ids = Array.from(document.querySelectorAll("#studentList input[type='checkbox']:checked")).map((el) =>
      Number(el.value)
    );

    try {
      const result = await apiFetch("/auth/register/", {
        method: "POST",
        body: { email, password, full_name, student_ids },
      });
      setToken(result.access, result.refresh);

      // Registration always creates a parent user in this MVP.
      window.location.href = "/app/parent/";
    } catch (err) {
      renderMessage(msg, "error", err.message || String(err));
    }
  });
}

async function pageParent() {
  const msg = $("#msg");
  try {
    const me = await loadMe();
    requireRole(me, "parent");
    setupHeader(me);

    await Promise.all([loadParentHomeworkTodos(msg), loadParentManualTodos(msg), loadParentAnnouncements(msg)]);

    setupParentTodoCreate(msg);
  } catch (err) {
    renderMessage(msg, "error", err.message || String(err));
  }
}

async function loadParentHomeworkTodos(msg) {
  const root = $("#homeworkTodos");
  if (!root) return;
  root.innerHTML = "<div class='text-sm text-slate-600'>Loading…</div>";

  const grouped = await apiFetch("/parent/homework-todos/grouped/");
  if (!grouped.length) {
    root.innerHTML = "<div class='text-sm text-slate-600'>No assigned homework.</div>";
    return;
  }

  root.innerHTML = grouped
    .map((g) => {
      const itemsHtml = g.items
        .map(
          (it) => `
          <div class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div class="min-w-0">
              <div class="truncate font-semibold text-slate-900">${escapeHtml(it.student_name)}</div>
              <div class="mt-1">${statusPill(it.status)}</div>
            </div>
            <button
              class="shrink-0 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              data-submit-status="${it.id}">
              Mark Submitted
            </button>
          </div>
        `
        )
        .join("");

      return `
        <div class="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="truncate text-base font-semibold text-slate-900">${escapeHtml(g.homework_title)}</div>
              <div class="mt-1 text-sm text-slate-600">Class: ${escapeHtml(g.class_name)} • Due: ${escapeHtml(g.homework_due_date)}</div>
            </div>
            <span class="hidden sm:inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800">Homework</span>
          </div>
          <div class="mt-4 space-y-3">${itemsHtml}</div>
        </div>
      `;
    })
    .join("");

  root.querySelectorAll("[data-submit-status]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const statusId = btn.getAttribute("data-submit-status");
      try {
        await apiFetch(`/parent/homework-status/${statusId}/submitted/`, { method: "PATCH" });
        await loadParentHomeworkTodos(msg);
      } catch (err) {
        renderMessage(msg, "error", err.message || String(err));
      }
    });
  });
}

async function loadParentManualTodos(msg) {
  const root = $("#manualTodos");
  if (!root) return;
  root.innerHTML = "<div class='text-sm text-slate-600'>Loading…</div>";

  const todos = await apiFetch("/parent/todos/");
  if (!todos.length) {
    root.innerHTML = "<div class='text-sm text-slate-600'>No manual todos.</div>";
    return;
  }

  root.innerHTML = todos
    .map(
      (t) => `
      <div class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div class="min-w-0">
          <div class="truncate font-semibold text-slate-900">${escapeHtml(t.text)}</div>
          <div class="mt-1 text-sm text-slate-600">Done: ${t.is_done ? "yes" : "no"}</div>
        </div>
        <div class="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
            data-toggle-todo="${t.id}" data-is-done="${t.is_done}">
            ${t.is_done ? "Mark Undone" : "Mark Done"}
          </button>
          <button
            class="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            data-delete-todo="${t.id}">
            Delete
          </button>
        </div>
      </div>
    `
    )
    .join("");

  root.querySelectorAll("[data-toggle-todo]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const todoId = btn.getAttribute("data-toggle-todo");
      const isDone = btn.getAttribute("data-is-done") === "true";
      try {
        await apiFetch(`/parent/todos/${todoId}/`, { method: "PATCH", body: { is_done: !isDone } });
        await loadParentManualTodos(msg);
      } catch (err) {
        renderMessage(msg, "error", err.message || String(err));
      }
    });
  });

  root.querySelectorAll("[data-delete-todo]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const todoId = btn.getAttribute("data-delete-todo");
      try {
        await apiFetch(`/parent/todos/${todoId}/`, { method: "DELETE" });
        await loadParentManualTodos(msg);
      } catch (err) {
        renderMessage(msg, "error", err.message || String(err));
      }
    });
  });
}

function setupParentTodoCreate(msg) {
  const form = $("#todoCreateForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = $("#todoText").value.trim();
    if (!text) return;

    try {
      await apiFetch("/parent/todos/", { method: "POST", body: { text } });
      $("#todoText").value = "";
      await loadParentManualTodos(msg);
    } catch (err) {
      renderMessage(msg, "error", err.message || String(err));
    }
  });
}

async function loadParentAnnouncements(msg) {
  const root = $("#announcements");
  if (!root) return;
  root.innerHTML = "<div class='text-sm text-slate-600'>Loading…</div>";

  const items = await apiFetch("/parent/announcements/");
  if (!items.length) {
    root.innerHTML = "<div class='text-sm text-slate-600'>No announcements.</div>";
    return;
  }

  root.innerHTML = items
    .map(
      (a) => `
      <div class="rounded-2xl border border-sky-100 bg-sky-50/60 px-5 py-4 shadow-sm">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="truncate text-sm font-semibold text-slate-900">${escapeHtml(a.title)}</div>
            <div class="mt-1 text-sm text-slate-700">${escapeHtml(a.message)}</div>
          </div>
          ${a.event_date ? `<span class=\"shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-200\">${escapeHtml(a.event_date)}</span>` : ""}
        </div>
      </div>
    `
    )
    .join("");
}

async function pageTeacher() {
  const msg = $("#msg");

  try {
    const me = await loadMe();
    requireRole(me, "teacher");
    setupHeader(me);

    await loadTeacherClasses(msg);
    setupTeacherHomeworkCreate(msg);
    setupTeacherAnnouncementCreate(msg);
  } catch (err) {
    renderMessage(msg, "error", err.message || String(err));
  }
}

async function loadTeacherClasses(msg) {
  const select = $("#classSelect");
  if (!select) return;
  const classes = await apiFetch("/teacher/classes/");

  select.innerHTML = classes
    .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
    .join("");

  if (!classes.length) {
    select.innerHTML = "";
    throw new Error("No classes found for this teacher.");
  }

  async function refresh() {
    const jobs = [];
    if ($("#teacherHomework")) jobs.push(loadTeacherHomework(msg));
    if ($("#teacherAnnouncements")) jobs.push(loadTeacherAnnouncements(msg));
    await Promise.all(jobs);
  }

  select.addEventListener("change", refresh);
  await refresh();
}

function getSelectedClassId() {
  const select = $("#classSelect");
  return select.value;
}

async function loadTeacherHomework(msg) {
  const root = $("#teacherHomework");
  if (!root) return;
  root.innerHTML = "<div class='text-sm text-slate-600'>Loading…</div>";

  const classId = getSelectedClassId();
  const items = await apiFetch(`/teacher/classes/${classId}/homework/`);
  if (!items.length) {
    root.innerHTML = "<div class='text-sm text-slate-600'>No homework yet for this class.</div>";
    return;
  }

  root.innerHTML = items
    .map(
      (hw) => `
      <div class="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="truncate text-base font-semibold text-slate-900">${escapeHtml(hw.title)}</div>
            <div class="mt-1 text-sm text-slate-600">Due: ${escapeHtml(hw.due_date)}</div>
          </div>
          <button
            class="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
            data-view-status="${hw.id}">
            View Statuses
          </button>
        </div>

        ${hw.description ? `<div class=\"mt-3 text-sm text-slate-700\">${escapeHtml(hw.description)}</div>` : ""}

        <div class="mt-4 space-y-3" data-status-root="${hw.id}"></div>
      </div>
    `
    )
    .join("");

  root.querySelectorAll("[data-view-status]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const homeworkId = btn.getAttribute("data-view-status");
      const statusRoot = root.querySelector(`[data-status-root=\"${homeworkId}\"]`);
      await loadTeacherHomeworkStatuses(msg, homeworkId, statusRoot);
    });
  });
}

async function loadTeacherHomeworkStatuses(msg, homeworkId, statusRoot) {
  statusRoot.innerHTML = "<div class='text-sm text-slate-600'>Loading statuses…</div>";
  const statuses = await apiFetch(`/teacher/homework/${homeworkId}/status/`);

  if (!statuses.length) {
    statusRoot.innerHTML = "<div class='text-sm text-slate-600'>No statuses found.</div>";
    return;
  }

  statusRoot.innerHTML = statuses
    .map((s) => {
      const canCheck = s.status === "submitted";
      return `
        <div class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div class="min-w-0">
            <div class="truncate font-semibold text-slate-900">${escapeHtml(s.student_name)}</div>
            <div class="mt-1">${statusPill(s.status)}</div>
          </div>
          <button
            class="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            ${canCheck ? "" : "disabled"}
            data-check-status="${s.id}">
            Mark Checked
          </button>
        </div>
      `;
    })
    .join("");

  statusRoot.querySelectorAll("[data-check-status]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const statusId = btn.getAttribute("data-check-status");
      try {
        await apiFetch(`/teacher/homework-status/${statusId}/checked/`, { method: "PATCH" });
        await loadTeacherHomeworkStatuses(msg, homeworkId, statusRoot);
      } catch (err) {
        renderMessage(msg, "error", err.message || String(err));
      }
    });
  });
}

function setupTeacherHomeworkCreate(msg) {
  const form = $("#homeworkCreateForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const classId = getSelectedClassId();

    const title = $("#hwTitle").value.trim();
    const description = $("#hwDesc").value.trim();
    const due_date = $("#hwDue").value;

    try {
      await apiFetch(`/teacher/classes/${classId}/homework/`, {
        method: "POST",
        body: { title, description, due_date },
      });
      $("#hwTitle").value = "";
      $("#hwDesc").value = "";
      $("#hwDue").value = "";
      await loadTeacherHomework(msg);
    } catch (err) {
      renderMessage(msg, "error", err.message || String(err));
    }
  });
}

async function loadTeacherAnnouncements(msg) {
  const root = $("#teacherAnnouncements");
  if (!root) return;
  root.innerHTML = "<div class='text-sm text-slate-600'>Loading…</div>";

  const classId = getSelectedClassId();
  const items = await apiFetch(`/teacher/classes/${classId}/announcements/`);
  if (!items.length) {
    root.innerHTML = "<div class='text-sm text-slate-600'>No announcements yet for this class.</div>";
    return;
  }

  root.innerHTML = items
    .map(
      (a) => `
      <div class="rounded-2xl border border-sky-100 bg-sky-50/60 px-5 py-4 shadow-sm">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="truncate text-sm font-semibold text-slate-900">${escapeHtml(a.title)}</div>
            <div class="mt-1 text-sm text-slate-700">${escapeHtml(a.message)}</div>
          </div>
          ${a.event_date ? `<span class=\"shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-200\">${escapeHtml(a.event_date)}</span>` : ""}
        </div>
      </div>
    `
    )
    .join("");
}

function setupTeacherAnnouncementCreate(msg) {
  const form = $("#announcementCreateForm");
  if (!form) return;

  const broadcastToggleBtn = $("#broadcastToggle");
  let broadcastEnabled = false;
  function syncBroadcastBtn() {
    if (!broadcastToggleBtn) return;
    if (broadcastEnabled) {
      broadcastToggleBtn.textContent = "Broadcast: On";
      broadcastToggleBtn.className =
        "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-pink-200 to-sky-200 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-white hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-indigo-300";
    } else {
      broadcastToggleBtn.textContent = "Broadcast: Off";
      broadcastToggleBtn.className =
        "inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300";
    }
  }

  if (broadcastToggleBtn) {
    syncBroadcastBtn();
    broadcastToggleBtn.addEventListener("click", () => {
      broadcastEnabled = !broadcastEnabled;
      syncBroadcastBtn();
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const classId = getSelectedClassId();

    const title = $("#anTitle").value.trim();
    const message = $("#anMsg").value.trim();
    const event_date = $("#anDate").value || null;

    try {
      if (broadcastEnabled) {
        await apiFetch("/teacher/announcements/broadcast/", {
          method: "POST",
          body: { title, message, event_date },
        });
        renderMessage(msg, "success", "Broadcast announcement created.");
      } else {
        await apiFetch(`/teacher/classes/${classId}/announcements/`, {
          method: "POST",
          body: { title, message, event_date },
        });
        renderMessage(msg, "success", "Announcement created.");
      }
      $("#anTitle").value = "";
      $("#anMsg").value = "";
      $("#anDate").value = "";
      await loadTeacherAnnouncements(msg);
    } catch (err) {
      renderMessage(msg, "error", err.message || String(err));
    }
  });
}

function setupTeacherBroadcastAnnouncement(msg) {
  const form = $("#broadcastForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = $("#bcTitle").value.trim();
    const message = $("#bcMsg").value.trim();
    const event_date = $("#bcDate").value || null;

    try {
      await apiFetch("/teacher/announcements/broadcast/", {
        method: "POST",
        body: { title, message, event_date },
      });
      $("#bcTitle").value = "";
      $("#bcMsg").value = "";
      $("#bcDate").value = "";
      renderMessage(msg, "success", "Broadcast announcement created.");
    } catch (err) {
      renderMessage(msg, "error", err.message || String(err));
    }
  });
}

async function pageAdmin() {
  const msg = $("#msg");
  try {
    const me = await loadMe();
    requireRole(me, "admin");
    setupHeader(me);

    await loadAdminParentStudentLinks(msg);
  } catch (err) {
    renderMessage(msg, "error", err.message || String(err));
  }
}

async function loadAdminParentStudentLinks(msg) {
  const root = $("#parentStudentLinks");
  if (!root) return;

  root.innerHTML = "<div class='text-sm text-slate-600'>Loading…</div>";

  try {
    const links = await apiFetch("/admin/parent-students/");
    if (!links.length) {
      root.innerHTML = "<div class='text-sm text-slate-600'>No links found.</div>";
      return;
    }

    root.innerHTML = links
      .map((l) => {
        const parentName = l.parent_name || l.parent_email || `Parent #${l.parent}`;
        const studentName = l.student_name || `Student #${l.student}`;
        const classText = l.student_class_name ? ` • Class: ${escapeHtml(l.student_class_name)}` : "";

        return `
          <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div class="text-sm text-slate-900"><span class="font-semibold">${escapeHtml(parentName)}</span> is parent of <span class="font-semibold">${escapeHtml(studentName)}</span>${classText}</div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    root.innerHTML = "<div class='text-sm text-rose-700'>Failed to load links.</div>";
    renderMessage(msg, "error", err.message || String(err));
  }
}

async function pageParentTab(pageKey) {
  const msg = $("#msg");
  try {
    const me = await loadMe();
    requireRole(me, "parent");
    setupHeader(me);

    if (pageKey === "parent" || pageKey === "parent-home") {
      await Promise.all([
        loadParentHomeworkTodos(msg),
        loadParentAnnouncements(msg),
        // Back-compat: if the page has manual todo widgets, load them too.
        loadParentManualTodos(msg),
      ]);
      setupParentTodoCreate(msg);
      return;
    }
    if (pageKey === "parent-homework") {
      await loadParentHomeworkTodos(msg);
      return;
    }
    if (pageKey === "parent-announcements") {
      await loadParentAnnouncements(msg);
      return;
    }
    if (pageKey === "parent-todos") {
      await loadParentManualTodos(msg);
      setupParentTodoCreate(msg);
      return;
    }
    if (pageKey === "parent-profile") {
      await loadParentProfile(me, msg);
      return;
    }
  } catch (err) {
    renderMessage(msg, "error", err.message || String(err));
  }
}

async function loadParentProfile(me, msg) {
  const nameEl = $("#profileName");
  const emailEl = $("#profileEmail");
  const roleEl = $("#profileRole");
  if (nameEl) nameEl.textContent = me.full_name || "—";
  if (emailEl) emailEl.textContent = me.email || "—";
  if (roleEl) roleEl.textContent = me.role || "—";

  const root = $("#linkedStudents");
  if (!root) return;
  root.innerHTML = "<div class='text-sm text-slate-600'>Loading…</div>";

  try {
    const students = await apiFetch("/parent/students/");
    if (!students.length) {
      root.innerHTML = "<div class='text-sm text-slate-600'>No linked children yet.</div>";
      return;
    }

    root.innerHTML = students
      .map(
        (s) => `
          <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div class="text-sm font-semibold text-slate-900">${escapeHtml(s.full_name)}</div>
            <div class="mt-0.5 text-xs text-slate-600">Class: ${escapeHtml(s.class_name)}</div>
          </div>
        `
      )
      .join("");
  } catch (err) {
    root.innerHTML = "<div class='text-sm text-rose-700'>Failed to load linked children.</div>";
    renderMessage(msg, "error", err.message || String(err));
  }
}

async function pageTeacherTab(pageKey) {
  const msg = $("#msg");
  try {
    const me = await loadMe();
    requireRole(me, "teacher");
    setupHeader(me);

    if (pageKey === "teacher-profile") {
      await loadTeacherProfile(me, msg);
      return;
    }

    // All teacher tabs rely on the class dropdown; the loaders are defensive.
    await loadTeacherClasses(msg);
    setupTeacherHomeworkCreate(msg);
    setupTeacherAnnouncementCreate(msg);
  } catch (err) {
    renderMessage(msg, "error", err.message || String(err));
  }
}

async function loadTeacherProfile(me, msg) {
  const nameEl = $("#profileName");
  const emailEl = $("#profileEmail");
  const roleEl = $("#profileRole");
  if (nameEl) nameEl.textContent = me.full_name || "—";
  if (emailEl) emailEl.textContent = me.email || "—";
  if (roleEl) roleEl.textContent = me.role || "—";

  const root = $("#teacherClasses");
  if (!root) return;
  root.innerHTML = "<div class='text-sm text-slate-600'>Loading…</div>";

  try {
    const classes = await apiFetch("/teacher/classes/");
    if (!classes.length) {
      root.innerHTML = "<div class='text-sm text-slate-600'>No classes assigned.</div>";
      return;
    }

    root.innerHTML = classes
      .map(
        (c) => `
          <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div class="text-sm font-semibold text-slate-900">${escapeHtml(c.name)}</div>
          </div>
        `
      )
      .join("");
  } catch (err) {
    root.innerHTML = "<div class='text-sm text-rose-700'>Failed to load classes.</div>";
    renderMessage(msg, "error", err.message || String(err));
  }
}

function main() {
  const page = document.body.getAttribute("data-page");
  if (page === "login") return pageLogin();
  if (page === "register") return pageRegister();
  if (page === "parent") return pageParentTab("parent");
  if (page === "teacher") return pageTeacherTab("teacher");
  if (page && page.startsWith("parent-")) return pageParentTab(page);
  if (page && page.startsWith("teacher-")) return pageTeacherTab(page);
  if (page === "admin") return pageAdminTab("admin");
  if (page && page.startsWith("admin-")) return pageAdminTab(page);
}

document.addEventListener("DOMContentLoaded", () => {
  setupModals();
  setupLogoutButtons();
  main();
});
