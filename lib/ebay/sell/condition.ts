/** Map free-text condition to eBay inventory item condition enum. */
export function mapConditionToEbayEnum(conditionDesc: string, notesCondition?: string): string {
  const text = `${notesCondition ?? ""} ${conditionDesc}`.toLowerCase();

  if (/new with (tags|box)|nwt|nwob|brand new/.test(text)) return "NEW";
  if (/new without|new other|open box/.test(text)) return "NEW_OTHER";
  if (/like new|excellent|mint/.test(text)) return "LIKE_NEW";
  if (/very good|lightly used/.test(text)) return "USED_EXCELLENT";
  if (/good|used - good/.test(text)) return "USED_VERY_GOOD";
  if (/fair|acceptable|used - acceptable/.test(text)) return "USED_ACCEPTABLE";
  if (/parts|not working|for parts/.test(text)) return "FOR_PARTS_OR_NOT_WORKING";

  return "USED_GOOD";
}
