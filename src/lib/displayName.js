export function profileDisplayName(profile) {
  if (!profile) return "User";
  return profile.nickname?.trim() || profile.full_name || "User";
}

export function coderDisplayName(profile) {
  if (!profile) return "Coder";
  const fullName = profile.full_name?.trim() || profile.coder_id || "Coder";
  const nickname = profile.nickname?.trim();
  if (!nickname) return fullName;
  return `${fullName} @ ${nickname}`;
}
