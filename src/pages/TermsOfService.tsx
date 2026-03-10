import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsOfService = () => {
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
                    <h1 className="text-3xl font-display font-bold mb-2">Terms and Conditions</h1>
                    <p className="text-sm text-muted-foreground mb-8">Last Updated: March 6, 2026</p>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">1. Parties</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            These Terms and Conditions are between you (“User”) and <strong>Recallio</strong> (“Recallio”, “we”, “us”, “our”). Recallio is the legal business name under which the service is operated.
                        </p>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">2. Acceptance of Terms</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            By creating an account or using this platform, you agree to be bound by these Terms and Conditions.
                            If you do not agree with these terms, you may not use the service.
                        </p>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">3. Description of Service</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Recallio provides a digital note-taking and study assistance tool designed primarily for university students. The platform allows users to create notes, store definitions, organize study material, and improve their academic workflow.
                            Features and functionality may change over time as the platform improves.
                        </p>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">4. User Accounts</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            To access certain features, you must create an account. You agree to:
                        </p>
                        <ul className="list-disc pl-5 text-muted-foreground space-y-2 mt-2">
                            <li>Provide accurate information</li>
                            <li>Maintain the security of your login credentials</li>
                            <li>Accept responsibility for all activity under your account</li>
                        </ul>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">5. Acceptable Use</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            You agree not to:
                        </p>
                        <ul className="list-disc pl-5 text-muted-foreground space-y-2 mt-2">
                            <li>Use the platform for illegal purposes</li>
                            <li>Attempt to hack, disrupt, or interfere with the service</li>
                            <li>Upload malicious or harmful content</li>
                            <li>Abuse or exploit the system</li>
                        </ul>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">6. User Content</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Users retain ownership of any notes or content they create on the platform. By using the service, you grant us permission to store and process your content solely to provide the service.
                        </p>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">7. Paid Subscriptions</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Some features may require a paid subscription.
                            Payments are securely processed by Paddle, our Merchant of Record and payment provider. Subscription fees may be billed on a recurring basis until canceled.
                        </p>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">8. Cancellation</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Users may cancel their subscription at any time through the billing portal or account settings.
                        </p>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">9. Service Availability</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We strive to maintain reliable access to the platform but cannot guarantee uninterrupted service at all times.
                        </p>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">10. Limitation of Liability</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            The platform is provided "as is". We are not liable for any indirect or consequential damages resulting from the use of the service.
                        </p>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">11. Changes to Terms</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            These terms may be updated periodically. Continued use of the service after changes constitutes acceptance of the updated terms.
                        </p>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-foreground">12. Contact</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            If you have questions regarding these Terms and Conditions, contact Recallio at:
                            <br />
                            <span className="font-medium text-accent">support@recallio.com</span>
                        </p>
                    </section>
                </article>
            </div>
        </div>
    );
};

export default TermsOfService;
