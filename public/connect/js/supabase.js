// =========================================================
// Client Supabase partagé par toutes les pages
// =========================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";


const isConfigured =
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("VOTRE_PROJET") &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_ANON_KEY.includes("VOTRE_CLE");


if (!isConfigured) {

    document.body.innerHTML = `
        <div class="config-error">
            <div class="brand-icon">C</div>
            <h1>Supabase n'est pas encore configuré</h1>
            <p>
                Ouvre le fichier <code>js/config.js</code> et colle l'URL de ton
                projet ainsi que ta clé publique (anon / publishable).
                Les étapes sont détaillées dans le <code>README.md</code>.
            </p>
        </div>
    `;

    document.body.classList.add("ready");

    throw new Error("Supabase non configuré : remplis js/config.js");
}


export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
