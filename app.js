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
      if (!existing && !first.id) {
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


  /* —— 相簿／影片牆 —— */
  var GALLERY_PAGE_SIZE = 12;
  var GALLERY_TAG_ORDER = ["小時候", "日記", "絕育", "日常", "午睡", "外出", "散步", "家人", "餐廳", "日落"];

  function formatGalleryDate(key) {
    var p = String(key).split("-");
    if (p.length < 3) return key;
    return Number(p[0]) + "年" + Number(p[1]) + "月" + Number(p[2]) + "日";
  }

  function monthKeyFromDate(dateStr) {
    return String(dateStr).slice(0, 7);
  }

  function formatMonthChip(ym) {
    var p = ym.split("-");
    return p[0] + "-" + p[1];
  }

  function playIconSvg() {
    return (
      '<svg viewBox="0 0 12 12" aria-hidden="true"><path fill="currentColor" d="M3 1.5v9l8-4.5z"/></svg>'
    );
  }

  function initGallery() {
    var section = document.getElementById("gallery");
    if (!section) return;

    var grid = section.querySelector("[data-gallery-grid]");
    var emptyEl = section.querySelector("[data-gallery-empty]");
    var moreWrap = section.querySelector("[data-gallery-more-wrap]");
    var moreBtn = section.querySelector("[data-gallery-more]");
    var datesRow = section.querySelector("[data-gallery-dates]");
    var tagsRow = section.querySelector("[data-gallery-tags]");
    var lightbox = document.querySelector("[data-lightbox]");
    if (!grid || !datesRow || !tagsRow || !lightbox) return;

    var state = {
      items: [],
      dateFilter: "all",
      tagFilter: null,
      shown: GALLERY_PAGE_SIZE
    };

    var lbMedia = lightbox.querySelector("[data-lightbox-media]");
    var lbDate = lightbox.querySelector("[data-lightbox-date]");
    var lbTags = lightbox.querySelector("[data-lightbox-tags]");
    var lbEntry = lightbox.querySelector("[data-lightbox-entry]");

    function todayParts() {
      var n = new Date();
      return { y: n.getFullYear(), m: n.getMonth() + 1, key: toDayKey(n) };
    }

    function matchesFilters(item) {
      var d = item.date;
      var df = state.dateFilter;
      if (df && df !== "all") {
        if (df === "month") {
          var t = todayParts();
          if (monthKeyFromDate(d) !== t.y + "-" + pad2(t.m)) return false;
        } else if (df === "year") {
          if (String(d).slice(0, 4) !== String(todayParts().y)) return false;
        } else if (df.indexOf("-") === 4 && df.length === 7) {
          if (monthKeyFromDate(d) !== df) return false;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(df)) {
          if (d !== df) return false;
        }
      }
      if (state.tagFilter) {
        var tags = item.tags || [];
        if (tags.indexOf(state.tagFilter) < 0) return false;
      }
      return true;
    }

    function filtered() {
      return state.items.filter(matchesFilters);
    }

    function makeChip(label, value, group) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gallery-chip";
      btn.textContent = label;
      btn.setAttribute("data-filter-group", group);
      btn.setAttribute("data-filter-value", value);
      return btn;
    }

    function buildFilterChips() {
      datesRow.innerHTML = "";
      tagsRow.innerHTML = "";

      datesRow.appendChild(makeChip("全部", "all", "date"));
      datesRow.appendChild(makeChip("本月", "month", "date"));
      datesRow.appendChild(makeChip("今年", "year", "date"));

      var months = {};
      state.items.forEach(function (it) {
        months[monthKeyFromDate(it.date)] = true;
      });
      Object.keys(months)
        .sort()
        .reverse()
        .forEach(function (ym) {
          datesRow.appendChild(makeChip(formatMonthChip(ym), ym, "date"));
        });

      tagsRow.appendChild(makeChip("全部標籤", "", "tag"));
      var present = {};
      state.items.forEach(function (it) {
        (it.tags || []).forEach(function (t) {
          present[t] = true;
        });
      });
      GALLERY_TAG_ORDER.forEach(function (t) {
        if (present[t]) tagsRow.appendChild(makeChip(t, t, "tag"));
      });

      syncChipActive();
    }

    function syncChipActive() {
      datesRow.querySelectorAll(".gallery-chip").forEach(function (btn) {
        var v = btn.getAttribute("data-filter-value");
        btn.classList.toggle("is-active", v === state.dateFilter);
      });
      tagsRow.querySelectorAll(".gallery-chip").forEach(function (btn) {
        var v = btn.getAttribute("data-filter-value") || "";
        var active = state.tagFilter ? v === state.tagFilter : v === "";
        btn.classList.toggle("is-active", active);
      });
    }

    function openLightbox(item) {
      lbMedia.innerHTML = "";
      if (item.type === "video") {
        var video = document.createElement("video");
        video.controls = true;
        video.playsInline = true;
        video.preload = "metadata";
        if (item.thumb) video.poster = item.thumb;
        var source = document.createElement("source");
        source.src = item.src;
        source.type = "video/mp4";
        video.appendChild(source);
        lbMedia.appendChild(video);
        try {
          video.play();
        } catch (e) {}
      } else {
        var img = document.createElement("img");
        img.src = item.src;
        img.alt = item.alt || "";
        lbMedia.appendChild(img);
      }
      lbDate.textContent = formatGalleryDate(item.date);
      lbTags.textContent = (item.tags || []).join(" · ");
      if (item.entryId && document.getElementById(item.entryId)) {
        lbEntry.hidden = false;
        lbEntry.href = "#" + item.entryId;
        lbEntry.onclick = function (e) {
          e.preventDefault();
          closeLightbox();
          jumpToEntry(item.entryId);
        };
      } else {
        lbEntry.hidden = true;
        lbEntry.onclick = null;
      }
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
      var v = lbMedia.querySelector("video");
      if (v) {
        try {
          v.pause();
        } catch (e) {}
      }
      lbMedia.innerHTML = "";
      lightbox.hidden = true;
      document.body.style.overflow = "";
    }

    function jumpToEntry(entryId) {
      var el = document.getElementById(entryId);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.remove("entry-flash");
      void el.offsetWidth;
      el.classList.add("entry-flash");
      window.setTimeout(function () {
        el.classList.remove("entry-flash");
      }, 1500);
    }

    function renderGrid() {
      var list = filtered();
      grid.innerHTML = "";
      if (!list.length) {
        emptyEl.hidden = false;
        moreWrap.hidden = true;
        return;
      }
      emptyEl.hidden = true;
      var slice = list.slice(0, state.shown);
      slice.forEach(function (item) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "gallery-item";
        btn.setAttribute("data-media-id", item.id);
        btn.setAttribute(
          "aria-label",
          (item.type === "video" ? "影片：" : "相片：") + (item.alt || item.id)
        );
        var img = document.createElement("img");
        img.className = "gallery-thumb";
        img.loading = "lazy";
        img.decoding = "async";
        img.alt = "";
        img.src = item.type === "video" ? item.thumb || item.src : item.src;
        btn.appendChild(img);
        if (item.type === "video") {
          var badge = document.createElement("span");
          badge.className = "gallery-play";
          badge.innerHTML = playIconSvg();
          btn.appendChild(badge);
        }
        btn.addEventListener("click", function () {
          openLightbox(item);
        });
        grid.appendChild(btn);
      });
      moreWrap.hidden = list.length <= state.shown;
    }

    function onFilterClick(e) {
      var btn = e.target.closest(".gallery-chip");
      if (!btn) return;
      var group = btn.getAttribute("data-filter-group");
      var value = btn.getAttribute("data-filter-value") || "";
      if (group === "date") {
        state.dateFilter = value || "all";
      } else if (group === "tag") {
        state.tagFilter = value || null;
      }
      state.shown = GALLERY_PAGE_SIZE;
      syncChipActive();
      renderGrid();
    }

    datesRow.addEventListener("click", onFilterClick);
    tagsRow.addEventListener("click", onFilterClick);
    moreBtn.addEventListener("click", function () {
      state.shown += GALLERY_PAGE_SIZE;
      renderGrid();
    });
    lightbox.querySelectorAll("[data-lightbox-close]").forEach(function (el) {
      el.addEventListener("click", closeLightbox);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
    });

    // Bidirectional: diary / outing thumbs open lightbox or jump with day filter
    function findBySrc(src) {
      if (!src) return null;
      var clean = src.split("#")[0].split("?")[0];
      var path = clean.replace(/^\.\//, "");
      for (var i = 0; i < state.items.length; i++) {
        var it = state.items[i];
        if (it.src === path || (it.thumb && it.thumb === path)) return it;
        if (path.endsWith(it.src) || (it.thumb && path.endsWith(it.thumb))) return it;
      }
      return null;
    }

    document.addEventListener("click", function (e) {
      var media = e.target.closest(
        ".journal-photo, .outing-img, .outing-video, .childhood-video, .timeline-card video, .outing-card video"
      );
      if (!media) return;
      if (media.closest("[data-gallery-grid], [data-lightbox]")) return;
      var src =
        media.currentSrc ||
        media.getAttribute("src") ||
        (media.querySelector &&
          media.querySelector("source") &&
          media.querySelector("source").getAttribute("src"));
      var item = findBySrc(src);
      if (!item && media.tagName === "VIDEO") {
        var poster = media.getAttribute("poster");
        item = findBySrc(poster);
      }
      if (!item) return;
      e.preventDefault();
      openLightbox(item);
    });

    // Deep link: #gallery?date=YYYY-MM-DD or hash day filter via query on hash
    function applyHashFilter() {
      var hash = location.hash || "";
      var m = hash.match(/^#gallery(?:\?(.*))?$/);
      if (!m) return;
      var params = new URLSearchParams(m[1] || "");
      var day = params.get("date");
      var tag = params.get("tag");
      if (day) state.dateFilter = day;
      if (tag) state.tagFilter = tag;
      syncChipActive();
      renderGrid();
    }

    window.addEventListener("hashchange", applyHashFilter);

    window.SimbaMedia = {
      open: openLightbox,
      close: closeLightbox,
      getItems: function () {
        return state.items;
      }
    };

    fetch("media.json", { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("media.json " + res.status);
        return res.json();
      })
      .then(function (data) {
        state.items = Array.isArray(data) ? data.slice() : [];
        state.items.sort(function (a, b) {
          if (a.date === b.date) return (a.id < b.id ? 1 : -1);
          return a.date < b.date ? 1 : -1;
        });
        buildFilterChips();
        applyHashFilter();
        renderGrid();
        try {
          document.dispatchEvent(new CustomEvent("simba:media-ready"));
        } catch (e) {}
      })
      .catch(function (err) {
        console.warn(err);
        emptyEl.hidden = false;
        emptyEl.textContent = "這段日子還沒有照片";
        moreWrap.hidden = true;
      });
  }


  function initOnThisDay() {
    var root = document.querySelector("[data-otd]");
    if (!root) return;

    var matrix = root.querySelector("[data-otd-matrix]");
    var label = root.querySelector("[data-otd-label]");
    var hint = root.querySelector("[data-otd-hint]");
    var prevBtn = root.querySelector("[data-otd-prev]");
    var nextBtn = root.querySelector("[data-otd-next]");
    var todayBtn = root.querySelector("[data-otd-today]");
    if (!matrix || !label) return;

    var WEEKDAYS_MON = ["一", "二", "三", "四", "五", "六", "日"];
    var state = {
      items: [],
      byDate: {},
      years: [],
      focus: startOfLocalDay(new Date())
    };

    function startOfLocalDay(d) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    function addDays(d, n) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
    }

    function mondayOf(d) {
      var day = d.getDay(); // 0 Sun
      var diff = day === 0 ? -6 : 1 - day;
      return addDays(d, diff);
    }

    function formatOtdLabel(d) {
      return (
        d.getMonth() +
        1 +
        "月" +
        d.getDate() +
        "日（週" +
        WEEKDAYS_ZH[d.getDay()] +
        "）"
      );
    }

    function mdParts(d) {
      return { m: d.getMonth() + 1, day: d.getDate() };
    }

    function keyForYearMD(year, m, day) {
      // clamp invalid dates (e.g. Feb 30) by checking rollover
      var dt = new Date(year, m - 1, day);
      if (dt.getFullYear() !== year || dt.getMonth() !== m - 1 || dt.getDate() !== day) {
        return null;
      }
      return year + "-" + pad2(m) + "-" + pad2(day);
    }

    function indexItems(list) {
      state.items = list.slice();
      state.byDate = {};
      var yearSet = {};
      state.items.forEach(function (it) {
        if (!it.date) return;
        if (!state.byDate[it.date]) state.byDate[it.date] = [];
        state.byDate[it.date].push(it);
        yearSet[String(it.date).slice(0, 4)] = true;
      });
      Object.keys(state.byDate).forEach(function (k) {
        state.byDate[k].sort(function (a, b) {
          return a.id < b.id ? 1 : -1;
        });
      });
      state.years = Object.keys(yearSet)
        .map(Number)
        .sort(function (a, b) {
          return b - a;
        });
      // Always include current year for empty rows context
      var cy = new Date().getFullYear();
      if (state.years.indexOf(cy) < 0) state.years.unshift(cy);
    }

    function openItem(item) {
      if (window.SimbaMedia && typeof window.SimbaMedia.open === "function") {
        window.SimbaMedia.open(item);
        return;
      }
      // Fallback: jump to gallery filtered by day
      location.hash = "#gallery?date=" + encodeURIComponent(item.date);
    }

    function render() {
      var focus = state.focus;
      var todayKey = toDayKey(new Date());
      label.textContent = formatOtdLabel(focus);

      var mon = mondayOf(focus);
      var cols = [];
      for (var i = 0; i < 7; i++) cols.push(addDays(mon, i));
      var focusCol = -1;
      for (var c = 0; c < 7; c++) {
        if (toDayKey(cols[c]) === toDayKey(focus)) focusCol = c;
      }

      matrix.innerHTML = "";

      var corner = document.createElement("div");
      corner.className = "otd-corner";
      corner.setAttribute("aria-hidden", "true");
      matrix.appendChild(corner);

      cols.forEach(function (d, idx) {
        var head = document.createElement("div");
        head.className = "otd-weekday";
        var wd = d.getDay();
        if (wd === 6) head.classList.add("is-sat");
        if (wd === 0) head.classList.add("is-sun");
        head.textContent = "週" + WEEKDAYS_MON[idx];
        matrix.appendChild(head);
      });

      if (!state.years.length) {
        if (hint) hint.textContent = "還沒有可對照的相片，先在相簿加入媒體。";
        return;
      }
      if (hint) {
        hint.textContent = "點格子開啟相片；右下角數字是當天張數。";
      }

      state.years.forEach(function (year) {
        var yEl = document.createElement("div");
        yEl.className = "otd-year";
        yEl.textContent = String(year);
        matrix.appendChild(yEl);

        cols.forEach(function (templateDay, colIdx) {
          var md = mdParts(templateDay);
          var key = keyForYearMD(year, md.m, md.day);
          var list = key ? state.byDate[key] || [] : [];
          var cell;

          if (!list.length) {
            cell = document.createElement("div");
            cell.className = "otd-cell is-empty";
            cell.setAttribute("role", "gridcell");
            var empty = document.createElement("span");
            empty.className = "otd-empty-label";
            empty.textContent = key
              ? md.m + "月" + md.day + "日"
              : "—";
            cell.appendChild(empty);
          } else {
            cell = document.createElement("button");
            cell.type = "button";
            cell.className = "otd-cell has-media";
            cell.setAttribute("role", "gridcell");
            var cover = list[0];
            cell.setAttribute(
              "aria-label",
              (key || "") +
                "，" +
                list.length +
                " 張" +
                (cover.alt ? "，" + cover.alt : "")
            );
            var img = document.createElement("img");
            img.className = "otd-thumb";
            img.loading = "lazy";
            img.decoding = "async";
            img.alt = "";
            img.src =
              cover.type === "video" ? cover.thumb || cover.src : cover.src;
            cell.appendChild(img);
            if (cover.type === "video") {
              var play = document.createElement("span");
              play.className = "otd-play";
              play.innerHTML =
                '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
              cell.appendChild(play);
            }
            if (list.length > 1) {
              var count = document.createElement("span");
              count.className = "otd-count";
              count.textContent = String(list.length);
              cell.appendChild(count);
            }
            cell.addEventListener("click", function () {
              openItem(cover);
            });
          }

          if (colIdx === focusCol) cell.classList.add("is-focus-col");
          if (key && key === todayKey) cell.classList.add("is-today-mark");
          matrix.appendChild(cell);
        });
      });
    }

    function shift(days) {
      state.focus = addDays(state.focus, days);
      render();
    }

    prevBtn && prevBtn.addEventListener("click", function () { shift(-1); });
    nextBtn && nextBtn.addEventListener("click", function () { shift(1); });
    todayBtn &&
      todayBtn.addEventListener("click", function () {
        state.focus = startOfLocalDay(new Date());
        render();
      });

    function ingest(list) {
      indexItems(Array.isArray(list) ? list : []);
      render();
    }

    function tryFromGlobal() {
      if (window.SimbaMedia && typeof window.SimbaMedia.getItems === "function") {
        var items = window.SimbaMedia.getItems();
        if (items && items.length) {
          ingest(items);
          return true;
        }
      }
      return false;
    }

    document.addEventListener("simba:media-ready", function () {
      tryFromGlobal();
    });

    if (!tryFromGlobal()) {
      fetch("media.json", { cache: "no-cache" })
        .then(function (res) {
          if (!res.ok) throw new Error("media.json " + res.status);
          return res.json();
        })
        .then(function (data) {
          ingest(data);
        })
        .catch(function (err) {
          console.warn(err);
          if (hint) hint.textContent = "無法載入相簿資料。";
        });
    }
  }


  function boot() {
    initCalendar();
    initGallery();
    initOnThisDay();
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
