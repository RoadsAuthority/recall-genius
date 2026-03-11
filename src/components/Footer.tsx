import { Link } from "react-router-dom";
import { Brain } from "lucide-react";

const Footer = () => {
    return (
        <footer className="bg-card border-t py-8 sm:py-12 px-4 mt-auto safe-area-inset-bottom">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8">
                <div className="flex items-center gap-2">
                    <Brain className="h-6 w-6 text-accent" />
                    <span className="font-display font-bold text-lg">Recallio</span>
                </div>

                <nav className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-muted-foreground">
                    <Link to="/" className="hover:text-accent transition-colors">Home</Link>
                    <Link to="/terms" className="hover:text-accent transition-colors">Terms of Service</Link>
                    <Link to="/privacy" className="hover:text-accent transition-colors">Privacy Policy</Link>
                    <Link to="/refund" className="hover:text-accent transition-colors">Refund Policy</Link>
                </nav>

                <div className="text-sm text-muted-foreground">
                    © {new Date().getFullYear()} Recallio. All rights reserved.
                </div>
            </div>
        </footer>
    );
};

export default Footer;
