export function canCreateCoderForClass(
  requesterRole: string,
  requesterId: string,
  classCoachId: string
) {
  if (requesterRole === "center_lead") return true;
  if (requesterRole === "coach" && requesterId === classCoachId) return true;
  return false;
}

export function canMoveCoderFromClass(
  requesterRole: string,
  requesterId: string,
  fromClassCoachId: string
) {
  if (requesterRole === "center_lead") return true;
  if (requesterRole === "coach" && requesterId === fromClassCoachId) return true;
  return false;
}
