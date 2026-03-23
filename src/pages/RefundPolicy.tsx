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
                    <p className="text-muted-foreground leading-relaxed mb-8">
                        Recallio processes payments through Paystack. The following payment and refund terms apply to your purchases.
                    </p>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-foreground">Payment, taxes and refunds</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Paystack will charge your chosen payment method for any paid transactions, including any applicable taxes according to the tax jurisdiction in which the transaction takes place.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            If you pre-order the Product, you will be charged upfront. You can request a refund for whatever reason until the content is delivered; after delivery, the standard refund policy applies.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            You agree to receipt of all invoices and receipts in an electronic format, which includes email. Product prices may change at any time.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            If technical problems prevent or unreasonably delay delivery of the Product, your exclusive and sole remedy is either replacement of the Product or refund of the price paid, as determined by Recallio in accordance with this policy.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            When providing your information, you must ensure that it is up-to-date and accurate. We are not responsible for non-receipt of the Product due to incorrect information provided by you.
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            We reserve the right to not fulfil and to cancel orders if payment is not received.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-foreground">Amendments and contact</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            To make amendments to your order or to request a refund, contact Recallio at{" "}
                            <span className="font-medium text-accent">support@recallio.com</span>.
                        </p>
                    </section>
                </article>
            </div>
        </div>
    );
};

export default RefundPolicy;
