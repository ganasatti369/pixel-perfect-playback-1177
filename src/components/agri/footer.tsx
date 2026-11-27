import { Sprout } from "lucide-react";
export function Footer() {
  return (
    <footer className="footer">
      <div className="site-inner footer-inner">
        <span className="flex items-center gap-2">
          <Sprout size={16} className="text-primary" />
          AgriCare AI · Growing a better tomorrow
        </span>
        <span>Made for Indian farmers, in their own language.</span>
      </div>
    </footer>
  );
}
