import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <Button
                    variant="ghost"
                    onClick={() => navigate(-1)}
                    className="mb-8 gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>

                <article className="prose prose-slate dark:prose-invert max-w-none bg-card p-8 rounded-xl border shadow-sm">
                    <h1 className="text-3xl font-display font-bold mb-2">Privacy Policy</h1>
                    <p className="text-sm text-muted-foreground mb-8">Last Updated: March 6, 2026</p>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">1. Introduction</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            This Privacy Policy explains how we collect, use, and protect your information when you use our platform.
                        </p>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">2. Information We Collect</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We may collect the following information:
                        </p>
                        <ul className="list-disc pl-5 text-muted-foreground space-y-2 mt-2">
                            <li>Account information (name, email)</li>
                            <li>Notes and study content created by users</li>
                            <li>Usage data to improve the platform</li>
                            <li>Payment information handled securely by Paddle</li>
                        </ul>
                        <p className="text-muted-foreground mt-4">
                            We do not store full payment card details.
                        </p>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">3. How We Use Information</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We use collected information to:
                        </p>
                        <ul className="list-disc pl-5 text-muted-foreground space-y-2 mt-2">
                            <li>Provide and improve our services</li>
                            <li>Maintain account functionality</li>
                            <li>Communicate with users</li>
                            <li>Ensure platform security</li>
                        </ul>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">4. Data Security</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We implement reasonable security measures to protect user information. However, no system is completely secure.
                        </p>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">5. Third-Party Services</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Payments and subscription billing are processed by Paddle. Their privacy policies may apply to payment transactions.
                        </p>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">6. Data Retention</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            User data may be stored for as long as necessary to provide services or comply with legal obligations.
                        </p>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">7. User Rights</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Users may request deletion of their account and associated data by contacting support.
                        </p>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">8. Changes to This Policy</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We may update this Privacy Policy occasionally. Updates will be posted on this page.
                        </p>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">9. Contact</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            For privacy-related questions contact:
                            <br />
                            <span className="font-medium text-accent">support@recallio.com</span>
                        </p>
                    </section>
                </article>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
