// Fork osefNAS : instance à deux, un seul groupe. La navigation court-circuite
// les écrans de sélection (liste des groupes, choix du groupe à l'ajout).
export const SOLO_GROUP_ID = 1;
export const SOLO_GROUP_LINK = `/groups/${SOLO_GROUP_ID}`;
export const SOLO_ADD_LINK = `/add?groupId=${SOLO_GROUP_ID}`;
