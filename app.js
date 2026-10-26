/**
 * Simba 生活日記 — 靜態展示 + 日曆導覽（訪客無法新增紀錄）
 */
(function () {
  "use strict";

  var WEEKDAYS_ZH = ["日", "一", "二", "三", "四", "五", "六"];

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function toDayKey(date) {
    return (
      date.getFullYear() +
      "-" +
      pad2(date.getMonth() + 1) +
      "-" +
      pad2(date.getDate())
    );
  }

  function parseDayKey(raw) {
    if (!raw) return null;
    var m = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }

  function parseYearMonthFromKey(key) {
    var parts = key.split("-");
    return { y: Number(parts[0]), m: Number(parts[1]) - 1 };
  }

  function formatMonthLabel(y, m0) {
    return y + "年" + (m0 + 1) + "月";
  }

  function formatDayLabel(key) {
    var p = key.split("-");
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return (
      Number(p[0]) +
      "年" +
      Number(p[1]) +
      "月" +
      Number(p[2]) +
      "日 · 週" +
      WEEKDAYS_ZH[d.getDay()]
    );
  }

  /** Collect dated content from the page. */
  function discoverRecords() {
    var map = Object.create(null); // dayKey -> [{el, title, kind}]

    function add(el, dayKey, title, kind) {
      if (!dayKey || !el) return;
      if (!map[dayKey]) map[dayKey] = [];
      map[dayKey].push({ el: el, title: title || "紀錄", kind: kind || "entry" });
    }

    // Prefer cards / timeline items with time[datetime] or data-date
    var cards = document.querySelectorAll(
      ".outing-card, .timeline-card, [data-date], article:has(> .outing-body time), article:has(time[datetime])"
    );
    // :has may fail on older engines — also walk time elements
    cards = document.querySelectorAll(".outing-card, .timeline-card, [data-date]");

    cards.forEach(function (card) {
      var day =
        parseDayKey(card.getAttribute("data-date")) ||
        (function () {
          var t = card.querySelector("time[datetime]");
          return t ? parseDayKey(t.getAttribute("datetime")) : null;
        })();
      if (!day) return;
      if (!card.getAttribute("data-date")) card.setAttribute("data-date", day);
      var titleEl = card.querySelector("h3");
      var title = titleEl ? titleEl.textContent.trim() : "紀錄";
      var kind = card.getAttribute("data-kind") || (card.classList.contains("outing-card") ? "outing" : "journal");
      add(card, day, title, kind);
    });

    // Fallback: any remaining time[datetime] not already covered
    document.querySelectorAll("time[datetime]").forEach(function (t) {
      var day = parseDayKey(t.getAttribute("datetime"));
      if (!day) return;
      var host =
        t.closest(".outing-card, .timeline-card, article, figure") || t.parentElement;
      if (!host) return;
      var already =
        map[day] &&
        map[day].some(function (r) {
          return r.el === host || r.el.contains(t);
        });
      if (already) return;
      var titleEl = host.querySelector("h3");
      var title =
        (titleEl && titleEl.textContent.trim()) ||
        (host.querySelector("figcaption") &&
          host.querySelector("figcaption").textContent.trim()) ||
        "紀錄";
      add(host, day, title, "entry");
    });

    // Ensure a stable day anchor on the first item of each day
    Object.keys(map).forEach(function (day) {
      var first = map[day][0].el;
      var anchorId = "day-" + day;
      var existing = document.getElementById(anchorId);
      if (!existing) {
        first.id = anchorId;
      }
    });

    return map;
  }

  function scrollToDay(dayKey) {
    var el = document.getElementById("day-" + dayKey);
    if (!el) {
      var records = discoverRecords();
      if (records[dayKey] && records[dayKey][0]) {
        el = records[dayKey][0].el;
      }
    }
    if (!el) return;
    if (history.replaceState) {
      history.replaceState(null, "", "#day-" + dayKey);
    } else {
      location.hash = "day-" + dayKey;
    }
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("day-flash");
    window.setTimeout(function () {
      el.classList.remove("day-flash");
    }, 1600);
  }

  function initCalendar() {
    var root = document.querySelector("[data-calendar]");
    if (!root) return;

    var grid = root.querySelector("[data-cal-grid]");
    var label = root.querySelector("[data-cal-label]");
    var hint = root.querySelector("[data-cal-hint]");
    var dayList = root.querySelector("[data-cal-day-list]");
    var prevBtn = root.querySelector("[data-cal-prev]");
    var nextBtn = root.querySelector("[data-cal-next]");
    if (!grid || !label) return;

    var records = discoverRecords();
    var days = Object.keys(records).sort();

    var viewY;
    var viewM;
    if (days.length) {
      var latest = days[days.length - 1];
      var ym = parseYearMonthFromKey(latest);
      viewY = ym.y;
      viewM = ym.m;
    } else {
      var now = new Date();
      viewY = now.getFullYear();
      viewM = now.getMonth();
    }

    var selectedDay = null;

    function renderDayList(dayKey) {
      if (!dayList) return;
      if (!dayKey || !records[dayKey]) {
        dayList.hidden = true;
        dayList.innerHTML = "";
        return;
      }
      selectedDay = dayKey;
      var items = records[dayKey];
      var html =
        '<p class="calendar-day-list-title">' +
        formatDayLabel(dayKey) +
        " · " +
        items.length +
        " 則</p><ul>";
      items.forEach(function (item, i) {
        var href =
          i === 0
            ? "#day-" + dayKey
            : item.el.id
              ? "#" + item.el.id
              : "#day-" + dayKey;
        html +=
          '<li><a href="' +
          href +
          '" data-jump-day="' +
          dayKey +
          '">' +
          escapeHtml(item.title) +
          "</a></li>";
      });
      html += "</ul>";
      dayList.innerHTML = html;
      dayList.hidden = false;
      dayList.querySelectorAll("[data-jump-day]").forEach(function (a) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          scrollToDay(a.getAttribute("data-jump-day"));
        });
      });
    }

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function render() {
      label.textContent = formatMonthLabel(viewY, viewM);
      grid.innerHTML = "";

      var first = new Date(viewY, viewM, 1);
      var startPad = first.getDay(); // 0=Sun
      var daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
      var todayKey = toDayKey(new Date());

      for (var i = 0; i < startPad; i++) {
        var empty = document.createElement("div");
        empty.className = "calendar-cell is-empty";
        empty.setAttribute("aria-hidden", "true");
        grid.appendChild(empty);
      }

      for (var d = 1; d <= daysInMonth; d++) {
        var key = viewY + "-" + pad2(viewM + 1) + "-" + pad2(d);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "calendar-cell";
        btn.setAttribute("role", "gridcell");
        btn.dataset.date = key;

        var has = !!records[key];
        if (has) btn.classList.add("has-record");
        if (key === todayKey) btn.classList.add("is-today");
        if (key === selectedDay) btn.classList.add("is-selected");

        btn.innerHTML =
          '<span class="calendar-day-num">' +
          d +
          "</span>" +
          (has ? '<span class="calendar-dot" aria-hidden="true"></span>' : "");

        if (has) {
          var count = records[key].length;
          btn.setAttribute(
            "aria-label",
            formatDayLabel(key) + "，有 " + count + " 則記錄"
          );
          btn.addEventListener(
            "click",
            (function (dayKey) {
              return function () {
                selectedDay = dayKey;
                render();
                renderDayList(dayKey);
                scrollToDay(dayKey);
              };
            })(key)
          );
        } else {
          btn.disabled = true;
          btn.setAttribute("aria-label", formatDayLabel(key) + "，無記錄");
        }

        grid.appendChild(btn);
      }

      if (hint) {
        var monthKeys = days.filter(function (k) {
          return k.indexOf(viewY + "-" + pad2(viewM + 1) + "-") === 0;
        });
        hint.textContent = monthKeys.length
          ? "本月有 " + monthKeys.length + " 天有記錄（圓點標記）"
          : "本月尚無記錄 · 圓點表示有記錄的日子";
      }
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        viewM -= 1;
        if (viewM < 0) {
          viewM = 11;
          viewY -= 1;
        }
        render();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        viewM += 1;
        if (viewM > 11) {
          viewM = 0;
          viewY += 1;
        }
        render();
      });
    }

    render();

    // Deep-link: #day-YYYY-MM-DD
    var hash = location.hash.replace(/^#/, "");
    var hashDay = hash.match(/^day-(\d{4}-\d{2}-\d{2})$/);
    if (hashDay && records[hashDay[1]]) {
      var h = parseYearMonthFromKey(hashDay[1]);
      viewY = h.y;
      viewM = h.m;
      selectedDay = hashDay[1];
      render();
      renderDayList(hashDay[1]);
    }
  }


  /* —— Shared likes + comments (Firebase RTDB when configured) —— */
  var ENGAGEMENT_STORAGE_KEY = "simba-life-visitor-id";

  function engagementConfig() {
    return window.SIMBA_ENGAGEMENT || {};
  }

  function escapeHtmlAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getVisitorId() {
    try {
      var id = localStorage.getItem(ENGAGEMENT_STORAGE_KEY);
      if (id && /^v_[a-z0-9]+$/i.test(id)) return id;
      id =
        "v_" +
        Math.random().toString(36).slice(2, 10) +
        Date.now().toString(36).slice(-4);
      localStorage.setItem(ENGAGEMENT_STORAGE_KEY, id);
      return id;
    } catch (e) {
      return "v_anon";
    }
  }

  function ensurePostId(card, index) {
    var id = card.id || card.getAttribute("data-post-id");
    if (id) {
      card.setAttribute("data-post-id", id);
      return id;
    }
    var date = card.getAttribute("data-date") || "unknown";
    var kind = card.getAttribute("data-kind") || "post";
    id = kind + "-" + date + "-" + index;
    card.id = id;
    card.setAttribute("data-post-id", id);
    return id;
  }

  function buildEngagementShell(postId) {
    var wrap = document.createElement("div");
    wrap.className = "engagement";
    wrap.setAttribute("data-engagement-for", postId);
    wrap.innerHTML =
      '<div class="engagement-bar">' +
      '<button type="button" class="like-btn" aria-pressed="false" aria-label="讚好">' +
      '<span class="like-heart" aria-hidden="true">♡</span>' +
      '<span class="like-count">0</span>' +
      "</button>" +
      '<span class="engagement-meta">留言</span>' +
      "</div>" +
      '<ul class="comment-list" aria-label="留言列表"></ul>' +
      '<form class="comment-form">' +
      '<input type="text" class="comment-input" maxlength="200" placeholder="寫留言…" autocomplete="off" enterkeyhint="send" />' +
      '<button type="submit" class="comment-send">送出</button>' +
      "</form>" +
      '<p class="engagement-status" hidden></p>';
    return wrap;
  }

  function formatCommentTime(ts) {
    if (!ts) return "";
    try {
      var d = new Date(ts);
      if (isNaN(d.getTime())) return "";
      return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate();
    } catch (e) {
      return "";
    }
  }

  function mountEngagement(card, shell) {
    var outingBody = card.querySelector(".outing-body");
    if (outingBody) {
      outingBody.appendChild(shell);
      return;
    }
    var media = card.querySelector(".entry-media");
    if (media) {
      media.insertAdjacentElement("afterend", shell);
      return;
    }
    card.appendChild(shell);
  }

  function initEngagement() {
    var cards = document.querySelectorAll(".timeline-card, .outing-card");
    if (!cards.length) return;

    var cfg = engagementConfig();
    var maxLen = cfg.maxCommentLength || 200;
    var rootPath = cfg.rootPath || "simba-life/posts";
    var visitorId = getVisitorId();
    var db = null;
    var live = false;

    if (
      cfg.enabled &&
      cfg.firebase &&
      cfg.firebase.apiKey &&
      cfg.firebase.databaseURL &&
      window.firebase
    ) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(cfg.firebase);
        }
        db = firebase.database();
        live = true;
      } catch (err) {
        console.warn("Simba engagement: Firebase init failed", err);
        live = false;
      }
    }

    cards.forEach(function (card, index) {
      var postId = ensurePostId(card, index);
      if (card.querySelector("[data-engagement-for]")) return;

      var shell = buildEngagementShell(postId);
      mountEngagement(card, shell);

      var likeBtn = shell.querySelector(".like-btn");
      var likeCountEl = shell.querySelector(".like-count");
      var heartEl = shell.querySelector(".like-heart");
      var listEl = shell.querySelector(".comment-list");
      var form = shell.querySelector(".comment-form");
      var input = shell.querySelector(".comment-input");
      var sendBtn = shell.querySelector(".comment-send");
      var statusEl = shell.querySelector(".engagement-status");
      var liked = false;
      var likeCount = 0;

      function setStatus(msg, isError) {
        if (!statusEl) return;
        if (!msg) {
          statusEl.hidden = true;
          statusEl.textContent = "";
          statusEl.classList.remove("is-error");
          return;
        }
        statusEl.hidden = false;
        statusEl.textContent = msg;
        statusEl.classList.toggle("is-error", !!isError);
      }

      function renderLike() {
        likeCountEl.textContent = String(likeCount);
        likeBtn.setAttribute("aria-pressed", liked ? "true" : "false");
        likeBtn.classList.toggle("is-liked", liked);
        heartEl.textContent = liked ? "♥" : "♡";
      }

      function renderComments(comments) {
        listEl.innerHTML = "";
        if (!comments || !comments.length) return;
        comments.forEach(function (c) {
          var li = document.createElement("li");
          li.className = "comment-item";
          li.innerHTML =
            '<span class="comment-text">' +
            escapeHtmlAttr(c.text) +
            "</span>" +
            (c.createdAt
              ? '<time class="comment-time">' +
                escapeHtmlAttr(formatCommentTime(c.createdAt)) +
                "</time>"
              : "");
          listEl.appendChild(li);
        });
      }

      if (!live) {
        likeBtn.disabled = true;
        input.disabled = true;
        input.placeholder = "留言即將開放";
        sendBtn.disabled = true;
        renderLike();
        return;
      }

      var postRef = db.ref(rootPath + "/" + postId);
      var likesRef = postRef.child("likes");
      var likeCountRef = postRef.child("likeCount");
      var commentsRef = postRef.child("comments");

      likeCountRef.on("value", function (snap) {
        var v = snap.val();
        likeCount = typeof v === "number" ? v : 0;
        renderLike();
      });

      likesRef.child(visitorId).on("value", function (snap) {
        liked = snap.val() === true;
        renderLike();
      });

      commentsRef.limitToLast(50).on("value", function (snap) {
        var raw = snap.val() || {};
        var arr = Object.keys(raw).map(function (k) {
          return {
            id: k,
            text: (raw[k] && raw[k].text) || "",
            createdAt: (raw[k] && raw[k].createdAt) || 0
          };
        });
        arr.sort(function (a, b) {
          return a.createdAt - b.createdAt;
        });
        renderComments(arr);
      });

      likeBtn.addEventListener("click", function () {
        likeBtn.disabled = true;
        var myLike = likesRef.child(visitorId);
        myLike
          .once("value")
          .then(function (snap) {
            var currently = snap.val() === true;
            if (currently) {
              return myLike.remove().then(function () {
                return likeCountRef.transaction(function (cur) {
                  cur = typeof cur === "number" ? cur : 0;
                  return cur > 0 ? cur - 1 : 0;
                });
              });
            }
            return myLike.set(true).then(function () {
              return likeCountRef.transaction(function (cur) {
                cur = typeof cur === "number" ? cur : 0;
                return cur + 1;
              });
            });
          })
          .catch(function (err) {
            console.warn(err);
            setStatus("暫時無法讚好，請稍後再試", true);
          })
          .then(function () {
            likeBtn.disabled = false;
          });
      });

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var text = (input.value || "").trim();
        if (!text) return;
        if (text.length > maxLen) {
          setStatus("留言請在 " + maxLen + " 字以內", true);
          return;
        }
        sendBtn.disabled = true;
        commentsRef
          .push({
            text: text.slice(0, maxLen),
            createdAt: Date.now()
          })
          .then(function () {
            input.value = "";
            setStatus("");
          })
          .catch(function (err) {
            console.warn(err);
            setStatus("留言送出失敗，請稍後再試", true);
          })
          .then(function () {
            sendBtn.disabled = false;
          });
      });
    });
  }

  function boot() {
    initCalendar();
    function startEngagement() {
      initEngagement();
    }
    // firebase-*-compat.js are defer; wait until available or give up briefly
    if (window.firebase || !engagementConfig().enabled) {
      startEngagement();
      return;
    }
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      if (window.firebase || tries > 40) {
        window.clearInterval(timer);
        startEngagement();
      }
    }, 50);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
