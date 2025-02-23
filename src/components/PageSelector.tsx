
import { Checkbox } from "@/components/ui/checkbox";

interface PageSelection {
  pageNum: number;
  selected: boolean;
}

interface PageSelectorProps {
  pageSelections: PageSelection[];
  onTogglePage: (pageNum: number) => void;
}

const PageSelector = ({ pageSelections, onTogglePage }: PageSelectorProps) => {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-sm font-medium mb-2">Select pages to summarize:</h3>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {pageSelections.map((page) => (
          <div key={page.pageNum} className="flex items-center space-x-2">
            <Checkbox
              id={`page-${page.pageNum}`}
              checked={page.selected}
              onCheckedChange={() => onTogglePage(page.pageNum)}
            />
            <label
              htmlFor={`page-${page.pageNum}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {page.pageNum}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PageSelector;

