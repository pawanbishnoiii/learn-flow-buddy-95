import { supabase } from "@/integrations/supabase/client";

const appId = import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID'] as
  | string
  | undefined;
const vapidKey = import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY'] as
  | string
  | undefined;

const firebaseConfig = {
  apiKey: import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY'] as
    | string
    | undefined,
  projectId: import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID'] as
    | string
    | undefined,
  appId,
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export type PushStatus =
  | "registered"
  | "not-configured"
  | "unsupported"
  | "open-in-new-tab"
  | "denied"
  | "signed-out";

export type PushResult = { status: PushStatus; token?: string };

export const pushCopy: Record<PushStatus, string> = {
  registered: "Notifications on — ab reminders is device par aayenge.",
  "not-configured": "Push abhi configure nahi hai. Admin ko bolo web push enable kare.",
  unsupported: "Is browser me push notifications support nahi hain.",
  "open-in-new-tab": "Preview iframe me permission nahi milti — app ko naye tab me kholo.",
  denied: "Notifications block hain — browser site settings se allow karo.",
  "signed-out": "Pehle sign in karo.",
};

/** Must be called from a click handler and from a top-level page (not an iframe). */
export async function enablePush(): Promise<PushResult> {
  if (
    !firebaseConfig.apiKey ||
    !firebaseConfig.projectId ||
    !appId ||
    !vapidKey ||
    !firebaseConfig.messagingSenderId
  ) {
    return { status: "not-configured" };
  }

  const { isSupported, getMessaging, getToken } = await import("firebase/messaging");
  const { initializeApp, getApps, getApp } = await import("firebase/app");

  if (!("Notification" in window) || !("serviceWorker" in navigator) || !(await isSupported())) {
    return { status: "unsupported" };
  }
  if (window.top !== window.self) return { status: "open-in-new-tab" };

  const permission =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const query = new URLSearchParams(
    Object.entries(firebaseConfig).filter(([, v]) => Boolean(v)) as [string, string][],
  ).toString();
  const registration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${query}`,
  );
  const app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: firebaseConfig.apiKey,
        projectId: firebaseConfig.projectId,
        appId,
        messagingSenderId: firebaseConfig.messagingSenderId,
      });
  const token = await getToken(getMessaging(app), {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) return { status: "denied" };

  const { data } = await supabase.auth.getUser();
  if (!data.user) return { status: "signed-out" };

  await supabase.from("device_tokens").upsert(
    {
      user_id: data.user.id,
      token,
      platform: "web",
      device_label: navigator.userAgent.slice(0, 80),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );

  return { status: "registered", token };
}
