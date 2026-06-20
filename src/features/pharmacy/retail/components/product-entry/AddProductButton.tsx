import { Plus } from "lucide-react";

export default function AddProductButton({
  handleSearchSelected,
  isEditing = false
}: {
  handleSearchSelected: () => void;
  isEditing?: boolean;
}) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    handleSearchSelected();
  }

  return (
    <button
      className={`w-full ${isEditing ? 'bg-warning text-warning-foreground hover:bg-warning/90' : 'bg-primary text-primary-foreground hover:bg-primary/90'} font-semibold h-11 px-6 rounded-md shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 group`}
      onClick={handleClick}
    >
      <div className="p-1 bg-white/20 rounded-md group-hover:rotate-90 transition-transform duration-300">
        <Plus size={16} strokeWidth={3} />
      </div>
      {isEditing ? 'UPDATE ITEM' : 'ADD TO BILL'}
    </button>
  );
}
