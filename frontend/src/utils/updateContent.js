export function parseUpdateContent(raw) {
  if (!raw) return { title: "", description: "", isStructured: false };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        title: parsed.title || parsed.update_type || "Update",
        description: parsed.description || "",
        department: parsed.department,
        updateType: parsed.update_type,
        dateTime: parsed.date_time,
        location: parsed.location,
        tags: parsed.tags || [],
        isStructured: true,
      };
    }
  } catch {
    /* not JSON — plain text update */
  }
  return { title: "", description: raw, isStructured: false };
}
