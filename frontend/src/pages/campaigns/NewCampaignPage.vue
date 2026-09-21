<template>
  <q-page class="q-pa-md flex flex-center">
    <q-card class="form-card q-pa-md">
      <q-card-section>
        <div class="text-h5">Nouvelle campagne</div>
        <div class="text-caption text-grey">
          Décrivez le type de prospect que vous souhaitez cibler.
        </div>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" @submit="onSubmit">
          <q-input
            v-model="form.name"
            label="Nom de la campagne"
            lazy-rules
            :rules="[(val) => !!val || 'Nom requis']"
          />

          <q-select
            v-model="form.targetLocation"
            label="Localisation"
            hint="Ville, région ou pays LinkedIn. Ex : Paris, France"
            use-input
            hide-selected
            fill-input
            input-debounce="0"
            :options="locationOptions"
            @filter="filterLocations"
            @input-value="(val) => (form.targetLocation = val)"
            lazy-rules
            :rules="[(val) => !!val || 'Localisation requise']"
          />

          <q-select
            v-model="form.targetIndustryId"
            label="Secteur d'activité"
            hint="Secteur LinkedIn utilisé pour la recherche d'entreprises"
            use-input
            input-debounce="0"
            :options="filteredIndustries"
            option-value="id"
            option-label="name"
            emit-value
            map-options
            @filter="filterIndustries"
            lazy-rules
            :rules="[(val) => !!val || 'Secteur requis']"
          />

          <q-select
            v-model="form.targetJobTitles"
            label="Postes des décideurs à cibler"
            hint="Choisissez un intitulé ou tapez le vôtre puis Entrée"
            use-input
            use-chips
            multiple
            hide-dropdown-icon
            new-value-mode="add-unique"
            :options="filteredTitles"
            @filter="filterTitles"
            :rules="[(val) => (val && val.length > 0) || 'Au moins un poste requis']"
          />

          <q-input
            v-model="form.targetKeywords"
            label="Mots-clés (optionnel)"
            hint="Ex : startup, B2B, tech"
          />

          <q-btn
            type="submit"
            color="primary"
            label="Créer la campagne"
            class="full-width"
            :loading="loading"
          />
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { defineComponent, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { Notify } from "quasar";
import { api } from "boot/axios";
import { extractErrorMessage } from "src/utils/error-message";
import {
  LINKEDIN_INDUSTRIES,
  COMMON_LOCATIONS,
  COMMON_DECISION_MAKER_TITLES,
} from "@heyfred/shared";

export default defineComponent({
  name: "NewCampaignPage",
  setup() {
    const router = useRouter();
    const loading = ref(false);

    const form = reactive({
      name: "",
      targetLocation: "",
      targetIndustryId: null,
      targetJobTitles: [],
      targetKeywords: "",
    });

    const locationOptions = ref(COMMON_LOCATIONS);
    function filterLocations(val, update) {
      update(() => {
        locationOptions.value =
          val === ""
            ? COMMON_LOCATIONS
            : COMMON_LOCATIONS.filter((v) => v.toLowerCase().includes(val.toLowerCase()));
      });
    }

    const filteredIndustries = ref(LINKEDIN_INDUSTRIES);
    function filterIndustries(val, update) {
      update(() => {
        filteredIndustries.value =
          val === ""
            ? LINKEDIN_INDUSTRIES
            : LINKEDIN_INDUSTRIES.filter((industry) =>
                industry.name.toLowerCase().includes(val.toLowerCase()),
              );
      });
    }

    const filteredTitles = ref(COMMON_DECISION_MAKER_TITLES);
    function filterTitles(val, update) {
      update(() => {
        filteredTitles.value =
          val === ""
            ? COMMON_DECISION_MAKER_TITLES
            : COMMON_DECISION_MAKER_TITLES.filter((v) => v.toLowerCase().includes(val.toLowerCase()));
      });
    }

    async function onSubmit() {
      loading.value = true;
      try {
        const industry = LINKEDIN_INDUSTRIES.find((i) => i.id === form.targetIndustryId);
        await api.post("/campaigns", {
          name: form.name,
          targetLocation: form.targetLocation,
          targetSector: industry?.name ?? "",
          targetIndustryId: form.targetIndustryId,
          targetJobTitles: form.targetJobTitles,
          targetKeywords: form.targetKeywords || undefined,
        });
        Notify.create({ type: "positive", message: "Campagne créée" });
        router.push("/campaigns");
      } catch (err) {
        Notify.create({
          type: "negative",
          message: extractErrorMessage(err, "Création impossible"),
        });
      } finally {
        loading.value = false;
      }
    }

    return {
      form,
      loading,
      locationOptions,
      filterLocations,
      filteredIndustries,
      filterIndustries,
      filteredTitles,
      filterTitles,
      onSubmit,
    };
  },
});
</script>

<style scoped>
.form-card {
  width: 100%;
  max-width: 560px;
}
</style>
