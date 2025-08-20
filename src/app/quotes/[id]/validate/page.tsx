import QuoteValidationPage from "@/components/quotes/QuoteValidationPage";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ValidateQuotePage({ params }: PageProps) {
  const { id } = await params;
  
  return <QuoteValidationPage quoteId={id} />;
}