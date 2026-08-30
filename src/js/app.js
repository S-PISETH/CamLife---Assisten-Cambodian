// CamLife (ជីវិតកម្ពុជា) - Vue 3 Main Application
import { createApp, ref, computed, onMounted, watch } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import {
  translations,
  realPlaces,
  provincesData,
  realJobsList
} from './data.js';

const app = createApp({
  setup() {
    // 1. Core State
    const currentPage = ref('home');
    const currentLang = ref(localStorage.getItem('camlife_lang') || 'en');
    const globalSearch = ref('');
    const mobileMenuOpen = ref(false);

    // 2. Data Collections
    const places = ref(realPlaces);
    const provinces = ref(provincesData);
    const jobs = ref(realJobsList);

    // 3. Near Me Feature State
    const nearMeCategory = ref('all');
    const nearMeSearch = ref('');

    // 4. 25 Provinces Explorer State
    const selectedProvince = ref(provincesData[2]); // Default to Takeo or Siem Reap (provincesData[2] is Takeo)
    const provinceTab = ref('attractions');

    // 5. Place Detail Modal & Favorites State
    const selectedPlace = ref(null);
    const favoriteIds = ref(JSON.parse(localStorage.getItem('camlife_favorites') || '[]'));
    const selectedJob = ref(realJobsList[0]);
    const showApplyModal = ref(false);
    const applyForm = ref({ fullName: '', email: '', phone: '', message: '' });

    // 6. Toast System
    const toast = ref({ show: false, message: '', type: 'success' });
    let toastTimer = null;
    const showToast = (message, type = 'success') => {
      if (toastTimer) clearTimeout(toastTimer);
      toast.value = { show: true, message, type };
      toastTimer = setTimeout(() => {
        toast.value.show = false;
      }, 3000);
    };

    // Helper: Translations
    const t = computed(() => translations[currentLang.value] || translations.en);

    // Filtered Lists
    const filteredPlaces = computed(() => {
      const q = globalSearch.value.trim().toLowerCase();
      return places.value.filter(p => {
        const matchesCategory = nearMeCategory.value === 'all' || p.category === nearMeCategory.value;
        const matchesSearch = !q ||
          p.name.toLowerCase().includes(q) ||
          p.nameKh.toLowerCase().includes(q) ||
          p.province.toLowerCase().includes(q) ||
          p.provinceKh.toLowerCase().includes(q) ||
          p.district.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.categoryLabel.toLowerCase().includes(q);
        return matchesCategory && matchesSearch;
      });
    });

    const filteredNearMePlaces = computed(() => {
      const q = nearMeSearch.value.trim().toLowerCase();
      return places.value.filter(p => {
        const matchesCat = nearMeCategory.value === 'all' || p.category === nearMeCategory.value;
        const matchesQ = !q || p.name.toLowerCase().includes(q) || p.nameKh.toLowerCase().includes(q) || p.district.toLowerCase().includes(q);
        return matchesCat && matchesQ;
      });
    });

    const filteredJobs = computed(() => {
      const q = globalSearch.value.trim().toLowerCase();
      if (!q) return jobs.value;
      return jobs.value.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.titleKh.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q)
      );
    });

    // Navigation & Page State
    const setPage = (page, dataItem = null) => {
      currentPage.value = page;
      mobileMenuOpen.value = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (page === 'province-detail' && dataItem) {
        selectedProvince.value = dataItem;
        provinceTab.value = 'attractions';
      } else if (page === 'job-detail' && dataItem) {
        selectedJob.value = dataItem;
      }
    };

    const toggleLang = (lang) => {
      currentLang.value = lang;
      localStorage.setItem('camlife_lang', lang);
      showToast(lang === 'kh' ? 'បានប្តូរទៅជា ភាសាខ្មែរ 🇰🇭' : 'Switched to English 🇬🇧');
    };

    const handleGlobalSearch = () => {
      const q = globalSearch.value.trim().toLowerCase();
      if (!q) return;

      // Check if searching for a province
      const matchedProvince = provinces.value.find(p =>
        p.name.toLowerCase().includes(q) ||
        p.nameKh.toLowerCase().includes(q) ||
        p.capital.toLowerCase().includes(q)
      );

      if (matchedProvince) {
        selectedProvince.value = matchedProvince;
        setPage('provinces');
        showToast(currentLang.value === 'kh' ? `បានរកឃើញ ${matchedProvince.nameKh}` : `Found ${matchedProvince.name}`);
        return;
      }

      if (q.includes('job') || q.includes('developer') || q.includes('ការងារ') || q.includes('salary')) {
        setPage('jobs');
      } else if (q.includes('province') || q.includes('ខេត្ត')) {
        setPage('provinces');
      } else {
        setPage('near-me');
      }
    };

    // Actions on Place Cards
    const isFavorite = (id) => {
      return favoriteIds.value.includes(id);
    };

    const toggleFavorite = (id) => {
      const idx = favoriteIds.value.indexOf(id);
      if (idx > -1) {
        favoriteIds.value.splice(idx, 1);
        showToast(currentLang.value === 'kh' ? 'បានលុបចេញពីការរក្សាទុក' : 'Removed from favorites');
      } else {
        favoriteIds.value.push(id);
        showToast(currentLang.value === 'kh' ? 'បានរក្សាទុកក្នុងបញ្ជីពេញចិត្ត! ⭐' : 'Saved to favorites! ⭐');
      }
      localStorage.setItem('camlife_favorites', JSON.stringify(favoriteIds.value));
    };

    const openPlaceDetail = (place) => {
      selectedPlace.value = place;
    };

    const closePlaceDetail = () => {
      selectedPlace.value = null;
    };

    const callNumber = (phone) => {
      if (!phone || phone === 'N/A') {
        showToast(currentLang.value === 'kh' ? 'មិនមានលេខទូរស័ព្ទសម្រាប់ទីតាំងនេះទេ' : 'No phone number available for this venue', 'info');
        return;
      }
      const clean = phone.replace(/[^0-9+]/g, '');
      window.location.href = `tel:${clean}`;
    };

    const openDirections = (place) => {
      const query = place.mapQuery || `${place.name} ${place.address}`;
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
    };

    const sharePlace = (place) => {
      if (navigator.share) {
        navigator.share({
          title: `${place.name} - CamLife`,
          text: `Check out ${place.name} in ${place.province}, Cambodia on CamLife!`,
          url: window.location.href
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(`${place.name} - ${place.address}, Cambodia`);
        showToast(currentLang.value === 'kh' ? 'បានចម្លងអាសយដ្ឋានទីតាំង!' : 'Copied place address to clipboard!');
      }
    };

    const submitJobApplication = () => {
      if (!applyForm.value.fullName || !applyForm.value.phone) {
        showToast(currentLang.value === 'kh' ? 'សូមបំពេញឈ្មោះ និងលេខទូរស័ព្ទ!' : 'Please enter your name and phone number!', 'warning');
        return;
      }
      showApplyModal.value = false;
      applyForm.value = { fullName: '', email: '', phone: '', message: '' };
      showToast(currentLang.value === 'kh' ? 'ការដាក់ពាក្យរបស់អ្នកត្រូវបានបញ្ជូនដោយជោគជ័យ!' : 'Application submitted successfully! The hiring team will contact you soon.', 'success');
    };

    onMounted(() => {
      const hash = window.location.hash.replace('#', '');
      const validPages = ['home', 'near-me', 'provinces', 'jobs', 'emergency', 'about'];
      if (validPages.includes(hash)) {
        currentPage.value = hash;
      }
    });

    watch(currentPage, (newPage) => {
      window.location.hash = newPage;
    });

    return {
      currentPage,
      currentLang,
      globalSearch,
      mobileMenuOpen,
      t,
      places,
      provinces,
      jobs,
      nearMeCategory,
      nearMeSearch,
      selectedProvince,
      provinceTab,
      selectedPlace,
      favoriteIds,
      selectedJob,
      showApplyModal,
      applyForm,
      toast,
      filteredPlaces,
      filteredNearMePlaces,
      filteredJobs,
      setPage,
      toggleLang,
      handleGlobalSearch,
      isFavorite,
      toggleFavorite,
      openPlaceDetail,
      closePlaceDetail,
      callNumber,
      openDirections,
      sharePlace,
      submitJobApplication,
      showToast
    };
  }
});

app.mount('#app');
