"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button, FormField, inputClassName } from "@/components/ui/Controls";
import { ErrorBanner } from "@/components/ui/Feedback";

interface AddBrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BrokerFormData) => Promise<void>;
}

interface BrokerFormData {
  name: string;
  email: string;
  companyName: string;
  phone: string;
  address: string;
  siretNumber: string;
  brokerCode: string;
}

const EMPTY_FORM: BrokerFormData = {
  name: "",
  email: "",
  companyName: "",
  phone: "",
  address: "",
  siretNumber: "",
  brokerCode: "",
};

export default function AddBrokerModal({
  isOpen,
  onClose,
  onSubmit,
}: AddBrokerModalProps) {
  const [formData, setFormData] = useState<BrokerFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateBrokerCode = () => {
    const namePart = formData.name
      .split(" ")
      .map((word) => word.substring(0, 2).toUpperCase())
      .join("");
    const datePart = new Date().getFullYear().toString().slice(-2);
    const randomPart = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    setFormData((prev) => ({
      ...prev,
      brokerCode: `BR${namePart}${datePart}${randomPart}`,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(formData);
      setFormData(EMPTY_FORM);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "La création du courtier a échoué.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof BrokerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      open={isOpen}
      title="Ajouter un courtier"
      size="lg"
      onClose={loading ? () => undefined : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" form="add-broker-form" disabled={loading}>
            {loading ? "Création…" : "Créer le courtier"}
          </Button>
        </>
      }
    >
      <form id="add-broker-form" onSubmit={handleSubmit} className="space-y-4">
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        <FormField id="broker-name" label="Nom complet">
          <input
            id="broker-name"
            className={inputClassName}
            required
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            autoComplete="name"
          />
        </FormField>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField id="broker-email" label="Adresse e-mail">
            <input
              id="broker-email"
              type="email"
              className={inputClassName}
              required
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              autoComplete="email"
            />
          </FormField>
          <FormField id="broker-phone" label="Téléphone">
            <input
              id="broker-phone"
              type="tel"
              className={inputClassName}
              required
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              autoComplete="tel"
            />
          </FormField>
          <FormField id="broker-company" label="Cabinet">
            <input
              id="broker-company"
              className={inputClassName}
              required
              value={formData.companyName}
              onChange={(e) => handleChange("companyName", e.target.value)}
            />
          </FormField>
          <FormField id="broker-siret" label="Numéro SIRET" hint="Facultatif">
            <input
              id="broker-siret"
              className={inputClassName}
              value={formData.siretNumber}
              onChange={(e) => handleChange("siretNumber", e.target.value)}
            />
          </FormField>
        </div>
        <FormField id="broker-address" label="Adresse">
          <textarea
            id="broker-address"
            className={inputClassName}
            required
            rows={3}
            value={formData.address}
            onChange={(e) => handleChange("address", e.target.value)}
          />
        </FormField>
        <FormField
          id="broker-code"
          label="Code courtier"
          hint="Identifiant interne du cabinet. Vous pouvez le générer."
        >
          <div className="flex gap-2">
            <input
              id="broker-code"
              className={inputClassName}
              required
              value={formData.brokerCode}
              onChange={(e) => handleChange("brokerCode", e.target.value)}
            />
            <Button type="button" variant="secondary" onClick={generateBrokerCode}>
              Générer
            </Button>
          </div>
        </FormField>
      </form>
    </Modal>
  );
}
