import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient.js";

const TODAY_INPUT_DATE = new Date().toISOString().split("T")[0];

const BASE_SCHEDULE = [
  { time: "0800", task: "Feed" },
  { time: "0915", task: "Nap", note: "1.5 hrs" },
  { time: "1030", task: "Wake up" },
  { time: "1100", task: "Feed" },
  { time: "1230", task: "Nap", note: "1 hr" },
  { time: "", task: "Medicine" },
  { time: "1400", task: "Feed" },
  { time: "1530", task: "Nap", note: "1 hr" },
  { time: "1700", task: "Feed" },
  { time: "", task: "Cat nap" },
  { time: "1845", task: "Bath, feed, bed" },
];

const TABS = [
  "Home",
  "Today",
  "Feed",
  "Sleep",
  "Journal",
  "Checklist",
  "Questions",
  "Milestones",
  "Work",
  "History",
  "Analytics",
];

export default function App() {
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [logs, setLogs] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [appItems, setAppItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("Home");
  const [historyFilter, setHistoryFilter] = useState("This Week");

  const [manualDate, setManualDate] = useState(TODAY_INPUT_DATE);
  const [manualTime, setManualTime] = useState("");

  const [feedDate, setFeedDate] = useState(TODAY_INPUT_DATE);
  const [feedTime, setFeedTime] = useState("");
  const [feedType, setFeedType] = useState("Nurse");
  const [activeSide, setActiveSide] = useState(null);
  const [leftSeconds, setLeftSeconds] = useState(0);
  const [rightSeconds, setRightSeconds] = useState(0);
  const [ounces, setOunces] = useState("");
  const [feedNotes, setFeedNotes] = useState("");

  const [sleepDate, setSleepDate] = useState(TODAY_INPUT_DATE);
  const [sleepStartTime, setSleepStartTime] = useState("");
  const [sleepEndTime, setSleepEndTime] = useState("");
  const [sleepStart, setSleepStart] = useState(null);
  const [sleepNotes, setSleepNotes] = useState("");

  const [journalDate, setJournalDate] = useState(TODAY_INPUT_DATE);
  const [journalTitle, setJournalTitle] = useState("");
  const [journalMood, setJournalMood] = useState("");
  const [journalBody, setJournalBody] = useState("");

  const [newItemText, setNewItemText] = useState({
    checklist: "",
    questions: "",
    milestones: "",
    work: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    loadAllData();
  }, [session]);

  useEffect(() => {
    let interval = null;

    if (activeSide === "Left") {
      interval = setInterval(() => setLeftSeconds((prev) => prev + 1), 1000);
    } else if (activeSide === "Right") {
      interval = setInterval(() => setRightSeconds((prev) => prev + 1), 1000);
    }

    return () => clearInterval(interval);
  }, [activeSide]);

  async function loadAllData() {
    setLoading(true);
    await Promise.all([loadLogs(), loadJournalEntries(), loadAppItems()]);
    setLoading(false);
  }

  async function loadLogs() {
    const { data, error } = await supabase
      .from("baby_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setLogs(data || []);
  }

  async function loadJournalEntries() {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setJournalEntries(data || []);
  }

  async function loadAppItems() {
    const { data, error } = await supabase
      .from("app_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setAppItems(data || []);
  }

  async function handleAuth(e) {
    e.preventDefault();
    setAuthMessage("");

    const authFn = authMode === "signIn" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await authFn({ email, password });

    if (error) {
      setAuthMessage(error.message);
    } else if (authMode === "signUp") {
      setAuthMessage("Account created. Check email confirmation if Supabase requires it, then sign in.");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setLogs([]);
    setJournalEntries([]);
    setAppItems([]);
  }

  function formatTimer(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function formatMinutes(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  function formatHours(totalMinutes) {
    return `${(totalMinutes / 60).toFixed(1)} hrs`;
  }

  function getFormattedDate(dateInput) {
    return new Date(`${dateInput}T00:00:00`).toLocaleDateString();
  }

  function getFormattedTime(dateInput, timeInput) {
    if (!timeInput) {
      return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    return new Date(`${dateInput}T${timeInput}`).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function addLog(type, details = "", customDate = null, customTime = null) {
    const now = new Date();
    const newLog = {
      type,
      details,
      date: customDate || now.toLocaleDateString(),
      time: customTime || now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const { data, error } = await supabase.from("baby_logs").insert(newLog).select().single();

    if (error) {
      console.error(error);
      alert("Could not save log. Check Supabase table/policies.");
      return;
    }

    setLogs((prev) => [data, ...prev]);
  }

  async function deleteLog(id) {
    const { error } = await supabase.from("baby_logs").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert("Could not delete entry.");
      return;
    }
    setLogs((prev) => prev.filter((log) => log.id !== id));
  }

  function quickLog(type) {
    const date = getFormattedDate(manualDate);
    const time = getFormattedTime(manualDate, manualTime);
    addLog(type, "", date, time);
    setManualTime("");
  }

  function saveFeed() {
    let detail = "";

    if (feedType === "Nurse") {
      if (leftSeconds === 0 && rightSeconds === 0) return;
      const parts = [];
      if (leftSeconds > 0) parts.push(`Left ${formatTimer(leftSeconds)}`);
      if (rightSeconds > 0) parts.push(`Right ${formatTimer(rightSeconds)}`);
      detail = `Nurse • ${parts.join(" • ")}`;
    }

    if (feedType === "Bottle") {
      if (!ounces.trim()) return;
      detail = `Bottle • ${ounces} oz`;
    }

    if (feedNotes.trim()) detail += ` • ${feedNotes}`;

    const date = getFormattedDate(feedDate);
    const time = getFormattedTime(feedDate, feedTime);

    addLog("Eat", detail, date, time);
    setActiveSide(null);
    setLeftSeconds(0);
    setRightSeconds(0);
    setOunces("");
    setFeedNotes("");
    setFeedTime("");
    setFeedType("Nurse");
  }

  function resetNursing() {
    setActiveSide(null);
    setLeftSeconds(0);
    setRightSeconds(0);
  }

  function startSleep() {
    if (sleepStart) return;
    setSleepStart(new Date());
  }

  function endSleep() {
    let start;
    let end;

    if (sleepStartTime && sleepEndTime) {
      start = new Date(`${sleepDate}T${sleepStartTime}`);
      end = new Date(`${sleepDate}T${sleepEndTime}`);
      if (end < start) end.setDate(end.getDate() + 1);
    } else {
      if (!sleepStart) return;
      start = sleepStart;
      end = new Date();
    }

    const durationMinutes = Math.round((end - start) / 1000 / 60);
    const startTime = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const endTime = end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    let detail = `${startTime} - ${endTime} • ${formatMinutes(durationMinutes)}`;
    if (sleepNotes.trim()) detail += ` • ${sleepNotes}`;

    addLog("Sleep", detail, start.toLocaleDateString(), startTime);
    setSleepStart(null);
    setSleepNotes("");
    setSleepStartTime("");
    setSleepEndTime("");
  }

  function cancelSleep() {
    setSleepStart(null);
    setSleepNotes("");
  }

  async function saveJournalEntry() {
    if (!journalBody.trim()) return;

    const entry = {
      entry_date: getFormattedDate(journalDate),
      title: journalTitle.trim(),
      mood: journalMood.trim(),
      body: journalBody.trim(),
    };

    const { data, error } = await supabase.from("journal_entries").insert(entry).select().single();
    if (error) {
      console.error(error);
      alert("Could not save journal entry.");
      return;
    }

    setJournalEntries((prev) => [data, ...prev]);
    setJournalTitle("");
    setJournalMood("");
    setJournalBody("");
  }

  async function deleteJournalEntry(id) {
    const { error } = await supabase.from("journal_entries").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert("Could not delete journal entry.");
      return;
    }
    setJournalEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  async function addAppItem(category) {
    const text = newItemText[category]?.trim();
    if (!text) return;

    const { data, error } = await supabase
      .from("app_items")
      .insert({ category, text, is_done: false })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Could not save item. Make sure the app_items table exists.");
      return;
    }

    setAppItems((prev) => [data, ...prev]);
    setNewItemText((prev) => ({ ...prev, [category]: "" }));
  }

  async function toggleAppItem(item) {
    const { data, error } = await supabase
      .from("app_items")
      .update({ is_done: !item.is_done })
      .eq("id", item.id)
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setAppItems((prev) => prev.map((x) => (x.id === item.id ? data : x)));
  }

  async function deleteAppItem(id) {
    const { error } = await supabase.from("app_items").delete().eq("id", id);
    if (error) {
      console.error(error);
      return;
    }
    setAppItems((prev) => prev.filter((item) => item.id !== id));
  }

  function parseDateString(dateString) {
    const [month, day, year] = dateString.split("/");
    return new Date(year, month - 1, day);
  }

  function formatDateHeader(dateString) {
    const inputDate = parseDateString(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const inputOnly = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (inputOnly.getTime() === todayOnly.getTime()) return "Today";
    if (inputOnly.getTime() === yesterdayOnly.getTime()) return "Yesterday";

    return inputDate.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  }

  function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
    return d;
  }

  function isThisWeek(dateString) {
    const logDate = parseDateString(dateString);
    const today = new Date();
    const startOfWeek = getStartOfWeek(today);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return logDate >= startOfWeek && logDate < endOfWeek;
  }

  function getSleepMinutes(dayLogs) {
    let total = 0;
    dayLogs.forEach((log) => {
      if (log.type !== "Sleep" || !log.details) return;
      const match = log.details.match(/(\d+)h\s+(\d+)m|(\d+)m/);
      if (!match) return;
      if (match[1] && match[2]) total += Number(match[1]) * 60 + Number(match[2]);
      else if (match[3]) total += Number(match[3]);
    });
    return total;
  }

  function getBottleOunces(dayLogs) {
    let total = 0;
    dayLogs.forEach((log) => {
      if (log.type !== "Eat" || !log.details?.includes("Bottle")) return;
      const match = log.details.match(/Bottle • ([0-9.]+) oz/);
      if (match) total += Number(match[1]);
    });
    return total;
  }

  function getDaySummary(dayLogs) {
    return {
      feeds: dayLogs.filter((log) => log.type === "Eat").length,
      wakes: dayLogs.filter((log) => log.type === "Wake").length,
      plays: dayLogs.filter((log) => log.type === "Play").length,
      sleeps: dayLogs.filter((log) => log.type === "Sleep").length,
      sleepMinutes: getSleepMinutes(dayLogs),
      bottleOunces: getBottleOunces(dayLogs),
    };
  }

  function getLast7Days() {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d.toLocaleDateString());
    }
    return days;
  }

  const todayDate = new Date().toLocaleDateString();
  const todayLogs = logs.filter((log) => log.date === todayDate);

  const filteredLogs = historyFilter === "This Week" ? logs.filter((log) => isThisWeek(log.date)) : logs;

  const groupedLogs = filteredLogs.reduce((groups, log) => {
    if (!groups[log.date]) groups[log.date] = [];
    groups[log.date].push(log);
    return groups;
  }, {});

  const groupedDates = Object.keys(groupedLogs).sort((a, b) => parseDateString(b) - parseDateString(a));

  const analyticsData = getLast7Days().map((date) => {
    const dayLogs = logs.filter((log) => log.date === date);
    const summary = getDaySummary(dayLogs);
    return {
      date,
      label: formatDateHeader(date),
      feeds: summary.feeds,
      sleepMinutes: summary.sleepMinutes,
      bottleOunces: summary.bottleOunces,
    };
  });

  const avgFeeds = (analyticsData.reduce((sum, day) => sum + day.feeds, 0) / analyticsData.length).toFixed(1);
  const avgSleepMinutes = Math.round(
    analyticsData.reduce((sum, day) => sum + day.sleepMinutes, 0) / analyticsData.length
  );
  const totalBottleOunces = analyticsData.reduce((sum, day) => sum + day.bottleOunces, 0);

  const scheduleSummary = useMemo(() => {
    const feeds = BASE_SCHEDULE.filter((x) => x.task.toLowerCase().includes("feed")).length;
    const naps = BASE_SCHEDULE.filter((x) => x.task.toLowerCase().includes("nap")).length;
    return { feeds, naps };
  }, []);

  if (loading) {
    return <CenteredMessage message="Loading Baby Tracker..." />;
  }

  if (!session) {
    return (
      <div style={pageStyle()}>
        <div style={{ maxWidth: "430px", margin: "0 auto" }}>
          <h1 style={titleStyle()}>Baby Tracker</h1>
          <div style={cardStyle()}>
            <h2 style={{ marginTop: 0 }}>{authMode === "signIn" ? "Sign In" : "Create Account"}</h2>
            <form onSubmit={handleAuth}>
              <label style={labelStyle()}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle()} />
              <label style={{ ...labelStyle(), marginTop: "12px" }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle()}
              />
              {authMessage && <p style={{ color: "#991b1b" }}>{authMessage}</p>}
              <button type="submit" style={{ ...actionButtonStyle("#2563eb", "#ffffff"), width: "100%", marginTop: "16px" }}>
                {authMode === "signIn" ? "Sign In" : "Create Account"}
              </button>
            </form>
            <button
              onClick={() => setAuthMode(authMode === "signIn" ? "signUp" : "signIn")}
              style={{ ...actionButtonStyle(), width: "100%", marginTop: "10px" }}
            >
              {authMode === "signIn" ? "Create an account" : "Back to sign in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle()}>
      <div style={{ maxWidth: "430px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
          <h1 style={titleStyle()}>Baby Tracker</h1>
          <button onClick={signOut} style={{ ...actionButtonStyle(), minHeight: "38px", padding: "8px 10px" }}>
            Sign Out
          </button>
        </div>

        <div style={tabContainerStyle()}>
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={tabButtonStyle(activeTab === tab)}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Home" && (
          <div style={cardStyle()}>
            <h2 style={{ marginTop: 0 }}>Today’s Base Schedule</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              <div style={summaryBoxStyle()}>Feeds planned: <strong>{scheduleSummary.feeds}</strong></div>
              <div style={summaryBoxStyle()}>Naps planned: <strong>{scheduleSummary.naps}</strong></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {BASE_SCHEDULE.map((item, index) => (
                <div key={index} style={scheduleItemStyle()}>
                  <div style={{ fontWeight: "800", color: "#1e3a8a", minWidth: "58px" }}>{item.time || "—"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "700" }}>{item.task}</div>
                    {item.note && <div style={{ color: "#6b7280", fontSize: "13px" }}>{item.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "Today" && (
          <>
            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Quick Log</h2>
              <label style={labelStyle()}>Log Date</label>
              <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} style={{ ...inputStyle(), margin: "8px 0 12px" }} />
              <label style={labelStyle()}>Log Time</label>
              <input type="time" value={manualTime} onChange={(e) => setManualTime(e.target.value)} style={{ ...inputStyle(), margin: "8px 0 16px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <button style={actionButtonStyle()} onClick={() => quickLog("Wake")}>Wake</button>
                <button style={actionButtonStyle()} onClick={() => quickLog("Play")}>Play</button>
              </div>
              <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: 0 }}>Leave time blank to use the current time.</p>
            </div>
            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Today</h2>
              {todayLogs.length === 0 ? <p style={{ color: "#6b7280" }}>No logs yet.</p> : todayLogs.map((log) => <LogCard key={log.id} log={log} />)}
            </div>
          </>
        )}

        {activeTab === "Feed" && (
          <div style={cardStyle()}>
            <h2 style={{ marginTop: 0 }}>Feed</h2>
            <label style={labelStyle()}>Feed Date</label>
            <input type="date" value={feedDate} onChange={(e) => setFeedDate(e.target.value)} style={{ ...inputStyle(), margin: "8px 0 12px" }} />
            <label style={labelStyle()}>Feed Time</label>
            <input type="time" value={feedTime} onChange={(e) => setFeedTime(e.target.value)} style={{ ...inputStyle(), margin: "8px 0 16px" }} />
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontWeight: "700", marginBottom: "10px" }}>Feed Type</div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button style={pillButton(feedType === "Nurse")} onClick={() => { setFeedType("Nurse"); setOunces(""); }}>Nurse</button>
                <button style={pillButton(feedType === "Bottle")} onClick={() => { setFeedType("Bottle"); setActiveSide(null); setLeftSeconds(0); setRightSeconds(0); }}>Bottle</button>
              </div>
            </div>
            {feedType === "Nurse" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                  {["Left", "Right"].map((side) => {
                    const seconds = side === "Left" ? leftSeconds : rightSeconds;
                    const isActive = activeSide === side;
                    return (
                      <div key={side} style={nursingCardStyle(isActive)}>
                        <div style={{ fontWeight: "700", marginBottom: "8px" }}>{side}</div>
                        <div style={{ fontSize: "32px", fontWeight: "700", marginBottom: "12px" }}>{formatTimer(seconds)}</div>
                        <button onClick={() => setActiveSide(side)} style={{ ...actionButtonStyle(isActive ? "#2563eb" : "#eff6ff", isActive ? "#ffffff" : "#1e3a8a"), width: "100%" }}>Start {side}</button>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                  <button style={{ ...actionButtonStyle(), flex: 1 }} onClick={() => setActiveSide(null)}>Pause</button>
                  <button style={{ ...actionButtonStyle(), flex: 1 }} onClick={resetNursing}>Reset</button>
                </div>
              </>
            )}
            {feedType === "Bottle" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle()}>Ounces</label>
                <input type="number" step="0.5" placeholder="e.g. 4" value={ounces} onChange={(e) => setOunces(e.target.value)} style={{ ...inputStyle(), marginTop: "8px" }} />
              </div>
            )}
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle()}>Notes</label>
              <input type="text" placeholder="Optional notes" value={feedNotes} onChange={(e) => setFeedNotes(e.target.value)} style={{ ...inputStyle(), marginTop: "8px" }} />
            </div>
            <button onClick={saveFeed} style={{ ...actionButtonStyle("#2563eb", "#ffffff"), width: "100%" }}>Save Feed</button>
          </div>
        )}

        {activeTab === "Sleep" && (
          <div style={cardStyle()}>
            <h2 style={{ marginTop: 0 }}>Sleep</h2>
            <label style={labelStyle()}>Sleep Date</label>
            <input type="date" value={sleepDate} onChange={(e) => setSleepDate(e.target.value)} style={{ ...inputStyle(), margin: "8px 0 12px" }} />
            <label style={labelStyle()}>Start Time</label>
            <input type="time" value={sleepStartTime} onChange={(e) => setSleepStartTime(e.target.value)} style={{ ...inputStyle(), margin: "8px 0 12px" }} />
            <label style={labelStyle()}>End Time</label>
            <input type="time" value={sleepEndTime} onChange={(e) => setSleepEndTime(e.target.value)} style={{ ...inputStyle(), margin: "8px 0 16px" }} />
            <p style={{ color: "#6b7280", fontSize: "13px", marginTop: 0 }}>Use start/end time to back-log sleep. Leave both blank to use live Start Sleep / End Sleep.</p>
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle()}>Notes</label>
              <input type="text" placeholder="Optional notes" value={sleepNotes} onChange={(e) => setSleepNotes(e.target.value)} style={{ ...inputStyle(), marginTop: "8px" }} />
            </div>
            {sleepStartTime && sleepEndTime ? (
              <button onClick={endSleep} style={{ ...actionButtonStyle("#2563eb", "#ffffff"), width: "100%" }}>Save Sleep</button>
            ) : !sleepStart ? (
              <button onClick={startSleep} style={{ ...actionButtonStyle("#2563eb", "#ffffff"), width: "100%" }}>Start Sleep</button>
            ) : (
              <>
                <div style={liveSleepStyle()}>Sleeping since {sleepStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={endSleep} style={{ ...actionButtonStyle("#2563eb", "#ffffff"), flex: 1 }}>End Sleep</button>
                  <button onClick={cancelSleep} style={{ ...actionButtonStyle(), flex: 1 }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "Journal" && (
          <div style={cardStyle()}>
            <h2 style={{ marginTop: 0 }}>Journal</h2>
            <label style={labelStyle()}>Entry Date</label>
            <input type="date" value={journalDate} onChange={(e) => setJournalDate(e.target.value)} style={{ ...inputStyle(), margin: "8px 0 12px" }} />
            <label style={labelStyle()}>Title</label>
            <input type="text" value={journalTitle} onChange={(e) => setJournalTitle(e.target.value)} placeholder="Optional title" style={{ ...inputStyle(), margin: "8px 0 12px" }} />
            <label style={labelStyle()}>Mood</label>
            <input type="text" value={journalMood} onChange={(e) => setJournalMood(e.target.value)} placeholder="e.g. tired, grateful, overwhelmed" style={{ ...inputStyle(), margin: "8px 0 12px" }} />
            <label style={labelStyle()}>Entry</label>
            <textarea value={journalBody} onChange={(e) => setJournalBody(e.target.value)} placeholder="Write about postpartum, baby milestones, hard days, gratitude, or anything else..." rows={6} style={{ ...inputStyle(), margin: "8px 0 16px", resize: "vertical" }} />
            <button onClick={saveJournalEntry} style={{ ...actionButtonStyle("#2563eb", "#ffffff"), width: "100%" }}>Save Journal Entry</button>
            <h3>Past Entries</h3>
            {journalEntries.length === 0 ? <p style={{ color: "#6b7280" }}>No journal entries yet.</p> : journalEntries.map((entry) => <JournalCard key={entry.id} entry={entry} />)}
          </div>
        )}

        {activeTab === "Checklist" && (
          <ListTab
            title="Checklist"
            category="checklist"
            placeholder="Add a checklist item..."
            appItems={appItems}
            newItemText={newItemText}
            setNewItemText={setNewItemText}
            addAppItem={addAppItem}
            toggleAppItem={toggleAppItem}
            deleteAppItem={deleteAppItem}
          />
        )}
        {activeTab === "Questions" && (
          <ListTab
            title="Doctor Questions"
            category="questions"
            placeholder="Add a question for the next appointment..."
            appItems={appItems}
            newItemText={newItemText}
            setNewItemText={setNewItemText}
            addAppItem={addAppItem}
            toggleAppItem={toggleAppItem}
            deleteAppItem={deleteAppItem}
          />
        )}
        {activeTab === "Milestones" && (
          <ListTab
            title="Milestones"
            category="milestones"
            placeholder="Add a milestone, first, or memory..."
            appItems={appItems}
            newItemText={newItemText}
            setNewItemText={setNewItemText}
            addAppItem={addAppItem}
            toggleAppItem={toggleAppItem}
            deleteAppItem={deleteAppItem}
          />
        )}
        {activeTab === "Work" && (
          <ListTab
            title="Work / Pumping Prep"
            category="work"
            placeholder="Add pump parts, bottles, charger, bags, snacks..."
            appItems={appItems}
            newItemText={newItemText}
            setNewItemText={setNewItemText}
            addAppItem={addAppItem}
            toggleAppItem={toggleAppItem}
            deleteAppItem={deleteAppItem}
          />
        )}

        {activeTab === "History" && (
          <div style={cardStyle()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", marginBottom: "14px" }}>
              <h2 style={{ margin: 0 }}>History</h2>
              <div style={{ display: "flex", gap: "8px" }}>
                <button style={pillButton(historyFilter === "This Week")} onClick={() => setHistoryFilter("This Week")}>This Week</button>
                <button style={pillButton(historyFilter === "All Time")} onClick={() => setHistoryFilter("All Time")}>All Time</button>
              </div>
            </div>
            {groupedDates.length === 0 ? <p style={{ color: "#6b7280" }}>No logs yet.</p> : groupedDates.map((date) => {
              const dayLogs = groupedLogs[date];
              const summary = getDaySummary(dayLogs);
              return (
                <div key={date} style={{ marginBottom: "18px" }}>
                  <h3 style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "6px" }}>{formatDateHeader(date)}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                    <div style={summaryBoxStyle()}>Feeds: <strong>{summary.feeds}</strong></div>
                    <div style={summaryBoxStyle()}>Sleep: <strong>{formatMinutes(summary.sleepMinutes)}</strong></div>
                    <div style={summaryBoxStyle()}>Bottle oz: <strong>{summary.bottleOunces}</strong></div>
                    <div style={summaryBoxStyle()}>Wake: <strong>{summary.wakes}</strong> | Play: <strong>{summary.plays}</strong></div>
                  </div>
                  {dayLogs.map((log) => <LogCard key={log.id} log={log} />)}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "Analytics" && (
          <div style={cardStyle()}>
            <h2 style={{ marginTop: 0 }}>Analytics</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              <div style={summaryBoxStyle()}>Avg feeds/day<br /><strong style={{ fontSize: "24px" }}>{avgFeeds}</strong></div>
              <div style={summaryBoxStyle()}>Avg sleep/day<br /><strong style={{ fontSize: "24px" }}>{formatHours(avgSleepMinutes)}</strong></div>
              <div style={summaryBoxStyle()}>Bottle oz<br /><strong style={{ fontSize: "24px" }}>{totalBottleOunces}</strong></div>
              <div style={summaryBoxStyle()}>Days tracked<br /><strong style={{ fontSize: "24px" }}>{analyticsData.filter((d) => d.feeds > 0 || d.sleepMinutes > 0 || d.bottleOunces > 0).length}</strong></div>
            </div>
            <h3>Feeds Per Day</h3>
            <BarChart data={analyticsData} valueKey="feeds" labelFormatter={(v) => v} />
            <h3>Sleep Per Day</h3>
            <BarChart data={analyticsData} valueKey="sleepMinutes" labelFormatter={(v) => formatMinutes(v)} />
          </div>
        )}
      </div>
    </div>
  );

  function LogCard({ log }) {
    return (
      <div style={logCardStyle()}>
        <strong>{log.type} — {log.time}</strong>
        {log.details && <div style={{ marginTop: "8px", color: "#374151" }}>{log.details}</div>}
        <button style={deleteButtonStyle()} onClick={() => deleteLog(log.id)}>Delete Entry</button>
      </div>
    );
  }

  function JournalCard({ entry }) {
    return (
      <div style={logCardStyle()}>
        <div style={{ fontWeight: "800" }}>{entry.title || "Untitled Entry"}</div>
        <div style={{ color: "#6b7280", fontSize: "13px", marginTop: "4px" }}>{entry.entry_date}{entry.mood ? ` • ${entry.mood}` : ""}</div>
        <div style={{ marginTop: "10px", whiteSpace: "pre-wrap" }}>{entry.body}</div>
        <button style={deleteButtonStyle()} onClick={() => deleteJournalEntry(entry.id)}>Delete Entry</button>
      </div>
    );
  }

  function BarChart({ data, valueKey, labelFormatter }) {
    const maxValue = Math.max(...data.map((d) => d[valueKey]), 1);
    return (
      <div style={{ border: "1px solid #e5e7eb", borderRadius: "18px", padding: "16px", backgroundColor: "#fafafa", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", height: "180px" }}>
          {data.map((day) => {
            const value = day[valueKey];
            const barHeight = `${(value / maxValue) * 100}%`;
            return (
              <div key={`${valueKey}-${day.date}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>{labelFormatter(value)}</div>
                <div style={{ width: "100%", maxWidth: "32px", height: barHeight, minHeight: value > 0 ? "8px" : "0px", backgroundColor: "#2563eb", borderRadius: "8px 8px 0 0" }} />
                <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "8px", textAlign: "center" }}>{day.label === "Today" || day.label === "Yesterday" ? day.label : day.label.slice(0, 3)}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}


function ListTab({
  title,
  category,
  placeholder,
  appItems,
  newItemText,
  setNewItemText,
  addAppItem,
  toggleAppItem,
  deleteAppItem,
}) {
  const items = appItems.filter((item) => item.category === category);
  const value = newItemText[category] || "";

  return (
    <div style={cardStyle()}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <input
          type="text"
          value={value}
          onChange={(e) =>
            setNewItemText((prev) => ({ ...prev, [category]: e.target.value }))
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") addAppItem(category);
          }}
          placeholder={placeholder}
          style={inputStyle()}
        />
        <button
          onClick={() => addAppItem(category)}
          style={actionButtonStyle("#2563eb", "#ffffff")}
        >
          Add
        </button>
      </div>
      {items.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No items yet.</p>
      ) : (
        items.map((item) => (
          <div key={item.id} style={listItemStyle(item.is_done)}>
            <input
              type="checkbox"
              checked={item.is_done}
              onChange={() => toggleAppItem(item)}
            />
            <div
              style={{
                flex: 1,
                textDecoration: item.is_done ? "line-through" : "none",
                color: item.is_done ? "#6b7280" : "#1e3a8a",
              }}
            >
              {item.text}
            </div>
            <button onClick={() => deleteAppItem(item.id)} style={smallDeleteButtonStyle()}>
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function CenteredMessage({ message }) {
  return (
    <div style={pageStyle()}>
      <div style={{ maxWidth: "430px", margin: "0 auto" }}>
        <div style={cardStyle()}>{message}</div>
      </div>
    </div>
  );
}

function pageStyle() {
  return { minHeight: "100vh", background: "linear-gradient(135deg, #ffe4ec, #e0f2fe)", padding: "20px 14px 90px", fontFamily: "Arial, sans-serif" };
}

function titleStyle() {
  return { textAlign: "center", fontSize: "36px", marginBottom: "18px", color: "#1e3a8a" };
}

function cardStyle() {
  return { backgroundColor: "#f8fbff", borderRadius: "24px", padding: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", marginBottom: "18px" };
}

function tabContainerStyle() {
  return { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "18px", backgroundColor: "#ffffff", padding: "8px", borderRadius: "18px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" };
}

function tabButtonStyle(isSelected) {
  return { padding: "12px 8px", borderRadius: "14px", border: "none", backgroundColor: isSelected ? "#2563eb" : "#dbeafe", color: isSelected ? "#ffffff" : "#1e3a8a", fontWeight: "700", fontSize: "13px", cursor: "pointer" };
}

function actionButtonStyle(background = "#eff6ff", color = "#1e3a8a") {
  return { padding: "12px 16px", borderRadius: "14px", border: "1px solid #bfdbfe", backgroundColor: background, color, fontWeight: "600", fontSize: "15px", cursor: "pointer", minHeight: "48px" };
}

function pillButton(isSelected) {
  return { padding: "12px 14px", borderRadius: "14px", border: isSelected ? "2px solid #2563eb" : "1px solid #bfdbfe", backgroundColor: isSelected ? "#2563eb" : "#eff6ff", color: isSelected ? "#ffffff" : "#1e3a8a", fontWeight: "700", fontSize: "14px", cursor: "pointer", minHeight: "48px" };
}

function inputStyle() {
  return { width: "100%", padding: "14px", borderRadius: "14px", border: "1px solid #d1d5db", boxSizing: "border-box", fontSize: "16px" };
}

function labelStyle() {
  return { fontWeight: "700" };
}

function summaryBoxStyle() {
  return { backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "14px", padding: "10px", fontSize: "14px", color: "#1e3a8a" };
}

function logCardStyle() {
  return { border: "1px solid #e5e7eb", borderRadius: "16px", padding: "14px", marginBottom: "10px", backgroundColor: "#fafafa" };
}

function deleteButtonStyle() {
  return { marginTop: "10px", padding: "8px 12px", borderRadius: "10px", border: "1px solid #fecaca", backgroundColor: "#fee2e2", color: "#991b1b", fontWeight: "700", cursor: "pointer" };
}

function smallDeleteButtonStyle() {
  return { padding: "6px 10px", borderRadius: "10px", border: "1px solid #fecaca", backgroundColor: "#fee2e2", color: "#991b1b", fontWeight: "700", cursor: "pointer" };
}

function scheduleItemStyle() {
  return { display: "flex", gap: "12px", alignItems: "center", padding: "14px", border: "1px solid #e5e7eb", borderRadius: "16px", backgroundColor: "#fafafa" };
}

function nursingCardStyle(isActive) {
  return { border: isActive ? "2px solid #4CAF50" : "1px solid #d1d5db", borderRadius: "20px", padding: "16px", backgroundColor: isActive ? "#f0fdf4" : "#fafafa" };
}

function liveSleepStyle() {
  return { marginBottom: "14px", padding: "14px", borderRadius: "16px", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", fontWeight: "600" };
}

function listItemStyle(isDone) {
  return { display: "flex", alignItems: "center", gap: "10px", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "12px", marginBottom: "10px", backgroundColor: isDone ? "#f3f4f6" : "#fafafa" };
}
