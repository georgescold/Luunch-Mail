"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Zap, Heart, ShoppingCart, Eye, PackageCheck, RefreshCw } from "lucide-react";
import { createFlowAction } from "@/server/automations-actions";

/* Modèles e-commerce proposés dans la modale « Créer un flow ». */
const TEMPLATE_CARDS: { key: string; label: string; trigger: string; icon: typeof Zap; desc: string }[] = [
  { key: "welcome", label: "Bienvenue", trigger: "Inscription", icon: Heart, desc: "Convertir le nouvel abonné en 3 e-mails." },
  { key: "abandoned_cart", label: "Panier abandonné", trigger: "Panier sans achat", icon: ShoppingCart, desc: "Récupérer la vente perdue." },
  { key: "browse_abandonment", label: "Navigation abandonnée", trigger: "Vue produit", icon: Eye, desc: "Relancer l'intérêt après une visite." },
  { key: "post_purchase", label: "Post-achat", trigger: "Commande", icon: PackageCheck, desc: "Onboarding, cross-sell et avis." },
  { key: "win_back", label: "Win-back", trigger: "Inactivité 90 j", icon: RefreshCw, desc: "Réveiller un client dormant." },
  { key: "replenishment", label: "Réapprovisionnement", trigger: "Cycle de conso", icon: RefreshCw, desc: "Déclencher le ré-achat au bon moment." },
];

export function CreateFlowModal() {
  return (
    <Modal
      title="Créer un flow"
      description="Partez d'un modèle e-commerce préconçu : le déclencheur et la séquence d'étapes sont pré-remplis."
      wide
      trigger={(open) => (
        <Button size="sm" onClick={open}>
          <Plus size={16} /> Créer un flow
        </Button>
      )}
    >
      {(close) => (
        <div className="grid grid-cols-1 gap-sp-3 sm:grid-cols-2">
          {TEMPLATE_CARDS.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <form key={tpl.key} action={createFlowAction} onSubmit={close}>
                <input type="hidden" name="template" value={tpl.key} />
                <button
                  type="submit"
                  className="flex w-full flex-col gap-sp-2 rounded-md border border-line bg-surface p-sp-4 text-left transition-colors hover:border-primary hover:bg-primary-soft/40"
                >
                  <span className="flex items-center gap-sp-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-soft text-primary">
                      <Icon size={16} />
                    </span>
                    <span className="font-medium text-ink">{tpl.label}</span>
                  </span>
                  <Badge tone="neutral" className="self-start"><Zap size={11} /> {tpl.trigger}</Badge>
                  <span className="text-xs text-ink-faint">{tpl.desc}</span>
                </button>
              </form>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
