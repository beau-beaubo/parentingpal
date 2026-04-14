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

  if (res.status === 401) {
    throw new Error("Unauthorized (401). Please login again.");
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

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

function setupHeader(me) {
  const meText = me ? `${me.email} (${me.role})` : "";
  ["#me", "#meDesktop"].forEach((sel) => {
    const el = $(sel);
    if (el) el.textContent = meText;
  });

  ["#logout", "#logoutDesktop", "#logoutDrawer"].forEach((sel) => {
    const btn = $(sel);
    if (!btn) return;
    btn.addEventListener("click", () => {
      clearToken();
      window.location.href = "/app/login/";
    });
  });
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

async function pageRegister() {
  const msg = $("#msg");
  const form = $("#registerForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    renderMessage(msg, "", "");

    const full_name = $("#fullName").value.trim();
    const email = $("#email").value.trim();
    const password = $("#password").value;

    try {
      const result = await apiFetch("/auth/register/", {
        method: "POST",
        body: { email, password, full_name },
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
  } catch (err) {
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
  } catch (err) {
    renderMessage(msg, "error", err.message || String(err));
  }
}

async function pageTeacherTab(pageKey) {
  const msg = $("#msg");
  try {
    const me = await loadMe();
    requireRole(me, "teacher");
    setupHeader(me);

    // All teacher tabs rely on the class dropdown; the loaders are defensive.
    await loadTeacherClasses(msg);
    setupTeacherHomeworkCreate(msg);
    setupTeacherAnnouncementCreate(msg);
  } catch (err) {
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
  if (page === "admin") return pageAdmin();
}

document.addEventListener("DOMContentLoaded", () => {
  setupModals();
  main();
});
