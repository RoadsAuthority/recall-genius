import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RefundPolicy = () => {
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
                    <h1 className="text-3xl font-display font-bold mb-2">Refund Policy</h1>
                    <p className="text-sm text-muted-foreground mb-8">Last Updated: March 6, 2026</p>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-foreground">Subscription Refunds</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Our platform offers subscription-based services for access to premium features.
                            Refund requests may be considered if submitted within 14 days of the initial purchase.
                            Refunds are handled through our payment provider Paddle.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-foreground">Cancellations</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Users can cancel their subscription at any time. After cancellation, access to premium features will continue until the end of the current billing period.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-foreground">Abuse of Refund Policy</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We reserve the right to refuse refunds in cases of abuse or excessive refund requests.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-foreground">Contact</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            To request a refund, contact:
                            <br />
                            <span className="font-medium text-accent">support@recallio.com</span>
                        </p>
                    </section>
                </article>
            </div>
        </div>
    );
};

export default RefundPolicy;
