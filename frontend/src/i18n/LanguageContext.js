import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "smart_crop_language";

const translations = {
  en: {
    nav: {
      brand: "Smart Crop Advisory",
      login: "Login",
      getStarted: "Get Started",
      dashboard: "Dashboard",
      logout: "Logout",
      language: "Language",
    },
    landing: {
      badge: "AI for Better Farming",
      title: "AI Powered Smart Crop Advisory",
      subtitle: "Helping small farmers choose the right crop, plan irrigation, and review market support using practical machine learning insights.",
    },
    login: {
      title: "Welcome Back",
      subtitle: "Login to access your advisory dashboard.",
      email: "Email",
      password: "Password",
      button: "Login",
      loading: "Logging in...",
      newUser: "New user?",
      createAccount: "Create account",
    },
    signup: {
      title: "Create Account",
      subtitle: "Join as farmer or admin to use the advisory platform.",
      name: "Name",
      email: "Email",
      password: "Password",
      role: "Role",
      farmer: "Farmer",
      admin: "Admin",
      button: "Sign Up",
      loading: "Creating account...",
      already: "Already registered?",
      passwordShort: "Password must be at least 6 characters.",
      success: "Account created successfully. Redirecting to login...",
    },
    farmer: {
      welcome: "Welcome",
      intro: "Choose a module below to run crop advisory, leaf disease detection, market guidance, or review history.",
      role: "Role",
      recentPredictions: "Recent Predictions",
      fetched: "Fetched from your account",
      cropTab: "Crop Prediction",
      diseaseTab: "Leaf Disease Prediction",
      marketTab: "Market & Schemes",
      historyTab: "Recent Predictions",
      cropEyebrow: "ML crop advisory",
      diseaseEyebrow: "CNN disease module",
      marketEyebrow: "MSP and schemes",
      historyEyebrow: "Saved activity",
      cropDesc: "Recommend the best crop using soil nutrients, state, season, and weather values.",
      diseaseDesc: "Upload a leaf image to detect disease symptoms and treatment advice.",
      marketDesc: "Review MSP, government schemes, and nearest KVK details for your state.",
      historyDesc: "Review previous crop and irrigation predictions from your account.",
      workflow: "Farmer Advisory Workflow",
      cropFormTitle: "Crop Prediction",
      cropFormSubtitle: "Select a crop preset or enter soil, season, state, and weather values manually.",
      autofillWeather: "Auto-fill Weather",
      fetchingWeather: "Fetching Weather...",
      quickPredict: "Quick Predict",
      predicting: "Predicting...",
      generatedAdvisory: "Generated Advisory",
      advisorySubtitle: "Use this summary for your project demo or farmer recommendation report.",
      printPdf: "Print / Save PDF",
      downloadPdf: "Download PDF",
      preparingPdf: "Preparing PDF...",
      state: "State",
      season: "Season",
      auto: "Auto",
      liveWeather: "Live Weather Snapshot",
      weatherReady: "Live values are ready to use in prediction.",
      noWeatherYet: "Use Auto-fill Weather to fetch temperature, humidity, and rainfall.",
      locationDenied: "Location permission was denied. Enter weather values manually.",
      geoUnsupported: "Geolocation is not supported in this browser. Enter weather values manually.",
      weatherFailed: "Could not auto-fill weather. Please enter temperature, humidity, and rainfall manually.",
      fillFields: "Please fill all input fields.",
      predictionFailed: "Prediction failed.",
      downloadBeforePredict: "Generate an advisory before downloading the report.",
      pdfFailed: "Could not generate PDF. Please use Print / Save PDF instead.",
      noPredictions: "No predictions available.",
      historyTitle: "Recent Predictions",
      crop: "Crop",
      irrigation: "Irrigation",
    },
    market: {
      title: "Market and Government Support",
      subtitle: "Static demo data for MSP, schemes, and local agricultural support.",
      loading: "Loading market information...",
      tip: "Seasonal market tip",
      msp: "Minimum Support Price",
      trend: "Market trend",
      schemes: "Government Schemes",
      kvk: "Nearest KVK Support",
      forCrop: "Selected crop",
      state: "State",
      season: "Season",
    },
    cropCard: {
      recommended: "Recommended Crop",
      confidence: "Confidence",
      irrigationRequirement: "Irrigation Requirement",
      aiExplanation: "AI Explanation",
      why: "Why this crop?",
      fertilizerAdvice: "Fertilizer Advice",
      seasonContext: "Season and Location Context",
      currentSeason: "Current season",
      state: "State",
      goodFit: "Good fit",
      yes: "Yes",
      no: "No",
      current: "Current",
      target: "Target",
      importance: "importance",
    },
    disease: {
      module: "Computer Vision Module",
      title: "Leaf Disease Detection",
      subtitle: "Upload a clear leaf image to estimate disease symptoms and treatment guidance.",
      drop: "Drop leaf image here",
      browse: "or click to browse JPG/PNG up to 5 MB",
      result: "Detection Result",
      resultSubtitle: "Useful for farmer triage and future CNN integration.",
      detect: "Detect Disease",
      analysing: "Analysing leaf image...",
      selectFile: "Please select a clear leaf image first.",
      badType: "Please upload a JPG or PNG leaf image.",
      bigFile: "Image must be 5 MB or less.",
      failed: "Disease detection failed. Try another image.",
      predicted: "Predicted Condition",
      severity: "Severity",
      treatment: "Treatment",
      prevention: "Prevention",
      topMatches: "Top Matches",
      helper: "For best results, upload a single leaf photo with good lighting and minimal background clutter.",
    },
    admin: {
      title: "Admin Dashboard",
      subtitle: "Monitor system metrics, predictions, and platform usage.",
      loading: "Loading admin analytics...",
      totalPredictions: "Total Predictions",
      userCount: "User Count",
      accuracy: "Accuracy",
      f1: "F1",
      modelMetrics: "Model Metrics",
      cropDistribution: "Crop Distribution",
      irrigationExcluded: "Irrigation-only records are excluded from crop distribution.",
      noPredictionData: "No prediction data available.",
    },
    sidebar: {
      navigation: "Navigation",
      farmerDashboard: "Farmer Dashboard",
      adminDashboard: "Admin Dashboard",
    },
  },
  hi: {
    nav: { brand: "स्मार्ट क्रॉप एडवाइजरी", login: "लॉगिन", getStarted: "शुरू करें", dashboard: "डैशबोर्ड", logout: "लॉगआउट", language: "भाषा" },
    landing: { badge: "बेहतर खेती के लिए AI", title: "AI आधारित स्मार्ट फसल सलाह", subtitle: "छोटे किसानों को सही फसल चुनने, सिंचाई की योजना बनाने और बाजार सहायता समझने में मदद करता है।" },
    login: { title: "फिर से स्वागत है", subtitle: "अपना सलाह डैशबोर्ड देखने के लिए लॉगिन करें।", email: "ईमेल", password: "पासवर्ड", button: "लॉगिन", loading: "लॉगिन हो रहा है...", newUser: "नए उपयोगकर्ता?", createAccount: "खाता बनाएं" },
    signup: { title: "खाता बनाएं", subtitle: "प्लेटफॉर्म उपयोग करने के लिए किसान या एडमिन के रूप में जुड़ें।", name: "नाम", email: "ईमेल", password: "पासवर्ड", role: "भूमिका", farmer: "किसान", admin: "एडमिन", button: "साइन अप", loading: "खाता बनाया जा रहा है...", already: "पहले से पंजीकृत हैं?", passwordShort: "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।", success: "खाता सफलतापूर्वक बन गया। लॉगिन पेज पर भेजा जा रहा है..." },
    farmer: { welcome: "स्वागत है", intro: "फसल सलाह, पत्ती रोग पहचान, बाजार जानकारी या इतिहास देखने के लिए नीचे से मॉड्यूल चुनें।", role: "भूमिका", recentPredictions: "हाल की भविष्यवाणियां", fetched: "आपके खाते से ली गई", cropTab: "फसल भविष्यवाणी", diseaseTab: "पत्ती रोग भविष्यवाणी", marketTab: "बाजार और योजनाएं", historyTab: "हाल की भविष्यवाणियां", cropEyebrow: "एमएल फसल सलाह", diseaseEyebrow: "सीएनएन रोग मॉड्यूल", marketEyebrow: "एमएसपी और योजनाएं", historyEyebrow: "सहेजी गई गतिविधि", cropDesc: "मिट्टी, राज्य, सीजन और मौसम के आधार पर उपयुक्त फसल सुझाएं।", diseaseDesc: "पत्ती की फोटो अपलोड करके रोग और उपचार सलाह देखें।", marketDesc: "अपने राज्य के लिए MSP, सरकारी योजनाएं और KVK जानकारी देखें।", historyDesc: "अपने खाते की पिछली भविष्यवाणियां देखें।", workflow: "किसान सलाह कार्यप्रवाह", cropFormTitle: "फसल भविष्यवाणी", cropFormSubtitle: "प्रिसेट चुनें या मिट्टी, राज्य, सीजन और मौसम मान भरें।", autofillWeather: "मौसम ऑटो-फिल", fetchingWeather: "मौसम लिया जा रहा है...", quickPredict: "भविष्यवाणी करें", predicting: "भविष्यवाणी हो रही है...", generatedAdvisory: "जनरेटेड सलाह", advisorySubtitle: "इसे प्रोजेक्ट डेमो या किसान रिपोर्ट में उपयोग करें।", printPdf: "प्रिंट / पीडीएफ सेव", downloadPdf: "पीडीएफ डाउनलोड", preparingPdf: "पीडीएफ तैयार हो रही है...", state: "राज्य", season: "सीजन", auto: "ऑटो", liveWeather: "लाइव मौसम सार", weatherReady: "लाइव मान भविष्यवाणी के लिए तैयार हैं।", noWeatherYet: "तापमान, आर्द्रता और वर्षा पाने के लिए ऑटो-फिल मौसम उपयोग करें।", locationDenied: "लोकेशन अनुमति अस्वीकार की गई। मौसम मान स्वयं भरें।", geoUnsupported: "इस ब्राउज़र में लोकेशन समर्थन नहीं है। मौसम मान स्वयं भरें।", weatherFailed: "मौसम ऑटो-फिल नहीं हो सका। तापमान, आर्द्रता और वर्षा स्वयं भरें।", fillFields: "कृपया सभी इनपुट भरें।", predictionFailed: "भविष्यवाणी असफल रही।", downloadBeforePredict: "पीडीएफ डाउनलोड करने से पहले सलाह जनरेट करें।", pdfFailed: "पीडीएफ नहीं बन सकी। कृपया प्रिंट / सेव पीडीएफ उपयोग करें।", noPredictions: "कोई भविष्यवाणी उपलब्ध नहीं है।", historyTitle: "हाल की भविष्यवाणियां", crop: "फसल", irrigation: "सिंचाई" },
    market: { title: "बाजार और सरकारी सहायता", subtitle: "MSP, योजनाओं और कृषि सहायता के लिए डेमो डेटा।", loading: "बाजार जानकारी लोड हो रही है...", tip: "मौसमी बाजार सुझाव", msp: "न्यूनतम समर्थन मूल्य", trend: "बाजार रुझान", schemes: "सरकारी योजनाएं", kvk: "निकटतम KVK सहायता", forCrop: "चयनित फसल", state: "राज्य", season: "सीजन" },
    cropCard: { recommended: "सुझाई गई फसल", confidence: "विश्वास", irrigationRequirement: "सिंचाई आवश्यकता", aiExplanation: "AI व्याख्या", why: "यह फसल क्यों?", fertilizerAdvice: "उर्वरक सलाह", seasonContext: "सीजन और स्थान संदर्भ", currentSeason: "वर्तमान सीजन", state: "राज्य", goodFit: "उपयुक्त", yes: "हाँ", no: "नहीं", current: "वर्तमान", target: "लक्ष्य", importance: "महत्व" },
    disease: { module: "कंप्यूटर विज़न मॉड्यूल", title: "पत्ती रोग पहचान", subtitle: "रोग लक्षण और उपचार सलाह के लिए स्पष्ट पत्ती छवि अपलोड करें।", drop: "यहाँ पत्ती छवि डालें", browse: "या JPG/PNG चुनने के लिए क्लिक करें", result: "पहचान परिणाम", resultSubtitle: "किसान सहायता और भविष्य के CNN मॉड्यूल के लिए उपयोगी।", detect: "रोग पहचानें", analysing: "पत्ती छवि का विश्लेषण हो रहा है...", selectFile: "पहले स्पष्ट पत्ती छवि चुनें।", badType: "कृपया JPG या PNG छवि अपलोड करें।", bigFile: "छवि 5 MB या कम होनी चाहिए।", failed: "रोग पहचान असफल रही। दूसरी छवि आज़माएँ।", predicted: "अनुमानित स्थिति", severity: "गंभीरता", treatment: "उपचार", prevention: "रोकथाम", topMatches: "शीर्ष मिलान", helper: "सर्वश्रेष्ठ परिणाम के लिए अच्छी रोशनी वाली एकल पत्ती छवि अपलोड करें।" },
    admin: { title: "एडमिन डैशबोर्ड", subtitle: "सिस्टम मेट्रिक्स, भविष्यवाणियां और प्लेटफॉर्म उपयोग देखें।", loading: "एडमिन एनालिटिक्स लोड हो रहा है...", totalPredictions: "कुल भविष्यवाणियां", userCount: "उपयोगकर्ता संख्या", accuracy: "सटीकता", f1: "एफ1", modelMetrics: "मॉडल मेट्रिक्स", cropDistribution: "फसल वितरण", irrigationExcluded: "सिर्फ सिंचाई वाले रिकॉर्ड फसल वितरण में शामिल नहीं हैं।", noPredictionData: "कोई भविष्यवाणी डेटा उपलब्ध नहीं है।" },
    sidebar: { navigation: "नेविगेशन", farmerDashboard: "किसान डैशबोर्ड", adminDashboard: "एडमिन डैशबोर्ड" },
  },
  mr: {
    nav: { brand: "स्मार्ट क्रॉप अॅडव्हायजरी", login: "लॉगिन", getStarted: "सुरू करा", dashboard: "डॅशबोर्ड", logout: "लॉगआउट", language: "भाषा" },
    landing: { badge: "चांगल्या शेतीसाठी AI", title: "AI आधारित स्मार्ट पीक सल्ला", subtitle: "लहान शेतकऱ्यांना योग्य पीक निवडणे, सिंचनाचे नियोजन करणे आणि बाजार सहाय्य समजून घेण्यास मदत करते." },
    login: { title: "पुन्हा स्वागत", subtitle: "आपला सल्ला डॅशबोर्ड पाहण्यासाठी लॉगिन करा.", email: "ईमेल", password: "पासवर्ड", button: "लॉगिन", loading: "लॉगिन सुरू आहे...", newUser: "नवीन वापरकर्ता?", createAccount: "खाते तयार करा" },
    signup: { title: "खाते तयार करा", subtitle: "प्लॅटफॉर्म वापरण्यासाठी शेतकरी किंवा अॅडमिन म्हणून सामील व्हा.", name: "नाव", email: "ईमेल", password: "पासवर्ड", role: "भूमिका", farmer: "शेतकरी", admin: "अॅडमिन", button: "साइन अप", loading: "खाते तयार होत आहे...", already: "आधीच नोंदणीकृत आहात?", passwordShort: "पासवर्ड किमान 6 अक्षरांचा असावा.", success: "खाते यशस्वीरित्या तयार झाले. लॉगिनकडे पाठवत आहोत..." },
    farmer: { welcome: "स्वागत आहे", intro: "पीक सल्ला, पान रोग ओळख, बाजार माहिती किंवा इतिहास पाहण्यासाठी खालील मॉड्यूल निवडा.", role: "भूमिका", recentPredictions: "अलीकडील अंदाज", fetched: "तुमच्या खात्यातून आणलेले", cropTab: "पीक अंदाज", diseaseTab: "पान रोग अंदाज", marketTab: "बाजार आणि योजना", historyTab: "अलीकडील अंदाज", cropEyebrow: "एमएल पीक सल्ला", diseaseEyebrow: "सीएनएन रोग मॉड्यूल", marketEyebrow: "एमएसपी आणि योजना", historyEyebrow: "जतन केलेली माहिती", cropDesc: "माती, राज्य, हंगाम आणि हवामानावरून योग्य पीक सुचवा.", diseaseDesc: "पानाचा फोटो अपलोड करून रोग आणि उपचार सल्ला पहा.", marketDesc: "तुमच्या राज्यासाठी MSP, सरकारी योजना आणि KVK माहिती पहा.", historyDesc: "तुमच्या खात्यातील मागील अंदाज पहा.", workflow: "शेतकरी सल्ला कार्यप्रवाह", cropFormTitle: "पीक अंदाज", cropFormSubtitle: "प्रिसेट निवडा किंवा माती, राज्य, हंगाम आणि हवामान मूल्ये भरा.", autofillWeather: "हवामान ऑटो-फिल", fetchingWeather: "हवामान घेत आहे...", quickPredict: "अंदाज घ्या", predicting: "अंदाज घेत आहे...", generatedAdvisory: "तयार सल्ला", advisorySubtitle: "हा सारांश प्रोजेक्ट डेमो किंवा शेतकरी अहवालासाठी वापरा.", printPdf: "प्रिंट / पीडीएफ सेव्ह", downloadPdf: "पीडीएफ डाउनलोड", preparingPdf: "पीडीएफ तयार होत आहे...", state: "राज्य", season: "हंगाम", auto: "ऑटो", liveWeather: "लाइव्ह हवामान सारांश", weatherReady: "लाइव्ह मूल्ये अंदाजासाठी तयार आहेत.", noWeatherYet: "तापमान, आर्द्रता आणि पाऊस मिळवण्यासाठी ऑटो-फिल वापरा.", locationDenied: "लोकेशन परवानगी नाकारली. हवामान मूल्ये स्वतः भरा.", geoUnsupported: "या ब्राउझरमध्ये लोकेशन समर्थन नाही. हवामान मूल्ये स्वतः भरा.", weatherFailed: "हवामान ऑटो-फिल झाले नाही. तापमान, आर्द्रता आणि पाऊस स्वतः भरा.", fillFields: "कृपया सर्व इनपुट भरा.", predictionFailed: "अंदाज अयशस्वी झाला.", downloadBeforePredict: "पीडीएफ डाउनलोड करण्यापूर्वी सल्ला तयार करा.", pdfFailed: "पीडीएफ तयार झाली नाही. कृपया प्रिंट / सेव्ह पीडीएफ वापरा.", noPredictions: "कोणतेही अंदाज उपलब्ध नाहीत.", historyTitle: "अलीकडील अंदाज", crop: "पीक", irrigation: "सिंचन" },
    market: { title: "बाजार आणि सरकारी मदत", subtitle: "MSP, योजना आणि कृषी सहाय्यासाठी डेमो डेटा.", loading: "बाजार माहिती लोड होत आहे...", tip: "हंगामी बाजार सूचना", msp: "किमान समर्थन किंमत", trend: "बाजार ट्रेंड", schemes: "सरकारी योजना", kvk: "जवळचे KVK सहाय्य", forCrop: "निवडलेले पीक", state: "राज्य", season: "हंगाम" },
    cropCard: { recommended: "शिफारस केलेले पीक", confidence: "विश्वास", irrigationRequirement: "सिंचन आवश्यकता", aiExplanation: "AI स्पष्टीकरण", why: "हे पीक का?", fertilizerAdvice: "खत सल्ला", seasonContext: "हंगाम आणि स्थान संदर्भ", currentSeason: "सध्याचा हंगाम", state: "राज्य", goodFit: "योग्य", yes: "होय", no: "नाही", current: "सध्याचे", target: "लक्ष्य", importance: "महत्त्व" },
    disease: { module: "कंप्युटर व्हिजन मॉड्यूल", title: "पान रोग ओळख", subtitle: "रोग लक्षणे आणि उपचार सल्ल्यासाठी स्पष्ट पानाचा फोटो अपलोड करा.", drop: "इथे पानाचा फोटो टाका", browse: "किंवा JPG/PNG निवडण्यासाठी क्लिक करा", result: "ओळख परिणाम", resultSubtitle: "शेतकरी सहाय्य आणि पुढील CNN मॉड्यूलसाठी उपयुक्त.", detect: "रोग ओळखा", analysing: "पानाचा फोटो तपासत आहे...", selectFile: "कृपया आधी स्पष्ट पानाचा फोटो निवडा.", badType: "कृपया JPG किंवा PNG फोटो अपलोड करा.", bigFile: "फोटो 5 MB किंवा कमी असावा.", failed: "रोग ओळख अयशस्वी झाली. दुसरा फोटो वापरा.", predicted: "अंदाजित स्थिती", severity: "तीव्रता", treatment: "उपचार", prevention: "प्रतिबंध", topMatches: "वरचे जुळणारे प्रकार", helper: "चांगल्या प्रकाशात एकाच पानाचा फोटो अपलोड केल्यास चांगला परिणाम मिळतो." },
    admin: { title: "अॅडमिन डॅशबोर्ड", subtitle: "सिस्टम मेट्रिक्स, अंदाज आणि प्लॅटफॉर्म वापर पाहा.", loading: "अॅडमिन अॅनालिटिक्स लोड होत आहे...", totalPredictions: "एकूण अंदाज", userCount: "वापरकर्ता संख्या", accuracy: "अचूकता", f1: "एफ1", modelMetrics: "मॉडेल मेट्रिक्स", cropDistribution: "पीक वितरण", irrigationExcluded: "फक्त सिंचन असलेले रेकॉर्ड पीक वितरणात दाखवले जात नाहीत.", noPredictionData: "कोणताही अंदाज डेटा उपलब्ध नाही." },
    sidebar: { navigation: "नेव्हिगेशन", farmerDashboard: "शेतकरी डॅशबोर्ड", adminDashboard: "अॅडमिन डॅशबोर्ड" },
  },
};

const LanguageContext = createContext(null);

function getNestedValue(source, path) {
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), source);
}

function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem(STORAGE_KEY) || "en");

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage: (next) => {
      localStorage.setItem(STORAGE_KEY, next);
      setLanguageState(next);
    },
    t: (key, fallback = key) => getNestedValue(translations[language], key) || getNestedValue(translations.en, key) || fallback,
    languageOptions: [
      { value: "en", label: "English" },
      { value: "hi", label: "Hindi" },
      { value: "mr", label: "Marathi" },
    ],
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}

export { LanguageProvider, useLanguage };
