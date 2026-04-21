export type AppStage = "jd" | "resume" | "ats" | "interview";

export type SidebarNavId = "workspace" | "ats" | "interview" | "saved";

/** Which JD-area sidebar row is highlighted when `stage === "jd"` (workspace vs saved are both stage jd). */
export type JdSidebarFocus = "workspace" | "saved";
