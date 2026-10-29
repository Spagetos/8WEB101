// =========================================================
// CONNECT — code commun à toutes les pages connectées
//
//  - vérifie que l'utilisateur est connecté (sinon → login)
//  - affiche la barre latérale avec son profil
//  - gère le statut "en ligne" (Supabase Realtime Presence)
//  - écoute les nouveaux messages reçus (badge + notifications)
// =========================================================

import { supabase } from "./supabase.js";

export { supabase };


// =========================================================
// UTILITAIRES
// =========================================================

export const COLORS = ["blue", "purple", "green", "pink", "orange"];


export function esc(text) {

    return String(text ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

}


export function fullName(profile) {

    const name =
        `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();

    return name || profile?.email || "Utilisateur";

}


export function initials(profile) {

    const first = (profile?.first_name || "").trim();
    const last = (profile?.last_name || "").trim();

    const value = (first[0] || "") + (last[0] || "");

    return (value || (profile?.email || "?")[0]).toUpperCase();

}


export function colorClass(profile) {

    if (COLORS.includes(profile?.color)) {
        return `avatar-${profile.color}`;
    }

    let hash = 0;

    for (const char of profile?.id || "") {
        hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    }

    return `avatar-${COLORS[hash % COLORS.length]}`;

}


export function avatarHTML(profile, { extraClass = "", online = false } = {}) {

    return `
        <div class="avatar ${colorClass(profile)} ${extraClass}">
            ${esc(initials(profile))}
            ${online ? '<span class="online-dot"></span>' : ""}
        </div>
    `;

}


function sameDay(a, b) {
    return a.toDateString() === b.toDateString();
}


export function formatTime(iso) {

    const date = new Date(iso);
    const now = new Date();

    if (sameDay(date, now)) {
        return date.toLocaleTimeString("fr-CA", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (sameDay(date, yesterday)) return "Hier";

    if (now - date < 6 * 86400000) {
        return date.toLocaleDateString("fr-CA", { weekday: "short" });
    }

    return date.toLocaleDateString("fr-CA", {
        day: "numeric",
        month: "short"
    });

}


export function dayLabel(iso) {

    const date = new Date(iso);
    const now = new Date();

    if (sameDay(date, now)) return "Aujourd'hui";

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (sameDay(date, yesterday)) return "Hier";

    return date.toLocaleDateString("fr-CA", {
        weekday: "long",
        day: "numeric",
        month: "long"
    });

}


export function timeAgo(iso) {

    const seconds = Math.round((Date.now() - new Date(iso)) / 1000);

    if (seconds < 60) return "À l'instant";

    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes} minute${minutes > 1 ? "s" : ""}`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? "s" : ""}`;

    const days = Math.round(hours / 24);
    return `Il y a ${days} jour${days > 1 ? "s" : ""}`;

}


// Distance en km entre deux points GPS (formule de haversine)
export function distanceKm(lat1, lng1, lat2, lng2) {

    const toRad = deg => deg * Math.PI / 180;
    const R = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(a));

}


export function formatDistance(km) {

    if (km < 1) return `À ${Math.round(km * 1000)} m`;

    return `À ${km.toLocaleString("fr-CA", { maximumFractionDigits: 1 })} km`;

}


export function showToast(message, type = "info") {

    let container = document.querySelector(".toast-container");

    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => toast.classList.add("leaving"), 3200);
    setTimeout(() => toast.remove(), 3600);

}


// =========================================================
// PROFILS
// =========================================================

let profilesCache = null;


export async function getProfiles({ refresh = false } = {}) {

    if (profilesCache && !refresh) return profilesCache;

    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("first_name");

    if (error) {
        console.error(error);
        showToast("Impossible de charger les utilisateurs.", "error");
        return profilesCache || new Map();
    }

    profilesCache = new Map(data.map(profile => [profile.id, profile]));

    return profilesCache;

}


// Retourne une Map : id de l'autre personne → { last, unread }
export async function loadConversations(userId) {

    const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

    const conversations = new Map();

    if (error) {
        console.error(error);
        return conversations;
    }

    for (const message of data) {

        const otherId =
            message.sender_id === userId
                ? message.receiver_id
                : message.sender_id;

        if (!conversations.has(otherId)) {
            conversations.set(otherId, { last: message, unread: 0 });
        }

        if (message.receiver_id === userId && !message.read_at) {
            conversations.get(otherId).unread++;
        }

    }

    return conversations;

}


// =========================================================
// BARRE LATÉRALE
// =========================================================

const NAV_ITEMS = [
    { id: "map", href: "map.html", icon: "⌖", label: "Map" },
    { id: "messages", href: "messages.html", icon: "▱", label: "Messages", badge: true },
    { id: "contacts", href: "contacts.html", icon: "♙", label: "Contacts" },
    { id: "settings", href: "settings.html", icon: "⚙", label: "Settings" }
];


function renderSidebar(profile) {

    const sidebar = document.getElementById("sidebar");

    if (!sidebar) return;

    const active = sidebar.dataset.active;

    const nav = NAV_ITEMS.map(item => `
        <a href="${item.href}" class="nav-item ${item.id === active ? "active" : ""}">
            <span class="nav-icon">${item.icon}</span>
            <span>${item.label}</span>
            ${item.badge ? '<span class="nav-badge" id="navBadge" hidden>0</span>' : ""}
        </a>
    `).join("");

    sidebar.innerHTML = `
        <div class="sidebar-top">

            <a href="index.html" class="brand">
                <div class="brand-icon">C</div>
                <span>Connect</span>
            </a>

            <nav class="main-nav">${nav}</nav>

        </div>

        <div class="sidebar-bottom">

            <div class="sidebar-user">

                <div id="sidebarAvatar">${avatarHTML(profile)}</div>

                <div class="sidebar-user-info">
                    <strong id="sidebarName">${esc(fullName(profile))}</strong>
                    <span id="sidebarRole">${esc(profile.role)}</span>
                </div>

                <a href="settings.html" class="user-settings" title="Paramètres">⚙</a>

            </div>

        </div>
    `;

}


export function updateSidebarProfile(profile) {

    const avatar = document.getElementById("sidebarAvatar");
    const name = document.getElementById("sidebarName");
    const role = document.getElementById("sidebarRole");

    if (avatar) avatar.innerHTML = avatarHTML(profile);
    if (name) name.textContent = fullName(profile);
    if (role) role.textContent = profile.role;

}


// =========================================================
// MESSAGES NON LUS
// =========================================================

let currentUserId = null;


export async function refreshUnreadBadge() {

    if (!currentUserId) return 0;

    const { count, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", currentUserId)
        .is("read_at", null);

    if (error) return 0;

    const badge = document.getElementById("navBadge");

    if (badge) {
        badge.textContent = count > 99 ? "99+" : count;
        badge.hidden = !count;
    }

    return count;

}


// =========================================================
// NOTIFICATIONS DU NAVIGATEUR
// =========================================================

export const NOTIF_KEYS = {
    push: "connect.notifications.push",
    messages: "connect.notifications.messages"
};


export function getNotifSetting(key, defaultValue = true) {

    try {
        const value = localStorage.getItem(key);
        return value === null ? defaultValue : value === "true";
    } catch {
        return defaultValue;
    }

}


export function setNotifSetting(key, value) {

    try {
        localStorage.setItem(key, String(value));
    } catch {
        // stockage indisponible (navigation privée…) : on ignore
    }

}


async function notifyNewMessage(message) {

    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!getNotifSetting(NOTIF_KEYS.push) || !getNotifSetting(NOTIF_KEYS.messages)) return;

    const onMessagesPage = location.pathname.endsWith("messages.html");

    if (onMessagesPage && !document.hidden) return;

    const profiles = await getProfiles();
    const sender = profiles.get(message.sender_id);

    const notification = new Notification(fullName(sender), {
        body: message.content.slice(0, 120),
        tag: `connect-${message.sender_id}`
    });

    notification.onclick = () => {
        window.focus();
        location.href = `messages.html?contact=${message.sender_id}`;
    };

}


function listenToIncomingMessages(userId) {

    supabase
        .channel(`inbox-${userId}`)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "messages",
                filter: `receiver_id=eq.${userId}`
            },
            payload => {

                refreshUnreadBadge();

                window.dispatchEvent(
                    new CustomEvent("connect:message", { detail: payload.new })
                );

                notifyNewMessage(payload.new);

            }
        )
        .subscribe();

}


// =========================================================
// PRÉSENCE (qui est en ligne ?)
// =========================================================

const onlineIds = new Set();
const presenceListeners = new Set();
let presenceChannel = null;
let presenceSubscribed = false;
let shouldTrack = true;


export function isOnline(userId) {
    return onlineIds.has(userId);
}


export function getOnlineCount() {
    return onlineIds.size;
}


export function onPresenceChange(callback) {
    presenceListeners.add(callback);
}


export async function setShowOnline(visible) {

    shouldTrack = visible;

    if (!presenceChannel || !presenceSubscribed) return;

    if (visible) {
        await presenceChannel.track({ online_at: new Date().toISOString() });
    } else {
        await presenceChannel.untrack();
    }

}


function startPresence(profile) {

    shouldTrack = profile.show_online;

    presenceChannel = supabase.channel("online-users", {
        config: { presence: { key: profile.id } }
    });

    presenceChannel
        .on("presence", { event: "sync" }, () => {

            onlineIds.clear();

            Object.keys(presenceChannel.presenceState())
                .forEach(id => onlineIds.add(id));

            presenceListeners.forEach(callback => callback(onlineIds));

        })
        .subscribe(async status => {

            if (status !== "SUBSCRIBED") return;

            presenceSubscribed = true;

            if (shouldTrack) {
                await presenceChannel.track({ online_at: new Date().toISOString() });
            }

        });

}


// =========================================================
// INITIALISATION D'UNE PAGE CONNECTÉE
// =========================================================

export async function initApp() {

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        location.replace("login.html");
        return new Promise(() => {}); // stoppe la suite du script
    }

    const user = session.user;
    currentUserId = user.id;

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (error || !profile) {

        console.error(error);

        document.body.innerHTML = `
            <div class="config-error">
                <div class="brand-icon">C</div>
                <h1>Profil introuvable</h1>
                <p>
                    Ton compte existe mais aucun profil n'a été trouvé.
                    Vérifie que le fichier <code>supabase/schema.sql</code> a bien été
                    exécuté <strong>avant</strong> la création du compte, puis réessaie.
                </p>
                <button class="primary-button" id="errorLogout">Se déconnecter</button>
            </div>
        `;

        document.body.classList.add("ready");

        document.getElementById("errorLogout").onclick = async () => {
            await supabase.auth.signOut();
            location.replace("login.html");
        };

        return new Promise(() => {});
    }

    renderSidebar(profile);
    startPresence(profile);
    listenToIncomingMessages(user.id);
    refreshUnreadBadge();

    supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", user.id)
        .then();

    supabase.auth.onAuthStateChange(event => {
        if (event === "SIGNED_OUT") location.replace("login.html");
    });

    document.body.classList.add("ready");

    return { supabase, user, profile };

}
