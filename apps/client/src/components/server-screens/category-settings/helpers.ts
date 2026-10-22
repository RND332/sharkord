// the category is refetched after every update, the saved values are applied once per category
// so a refetch does not drop the edits of the user before they are saved or discarded
const shouldApplyCategoryValues = (
  initializedCategoryId: number | null,
  categoryId: number
) => initializedCategoryId !== categoryId;

export { shouldApplyCategoryValues };
