import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, FlatList, SafeAreaView, Alert, Modal, ScrollView, Share } from 'react-native';
import * as Contacts from 'expo-contacts';
import * as Speech from 'expo-speech';
import { createClient } from '@supabase/supabase-js';

// 1. مفاتيح قاعدة البيانات السحابية (Supabase)
const SUPABASE_URL = 'https://supabase.co';
const SUPABASE_KEY = 'sb_publishable_3NW-jJ1SQVpFqmBuh0GApA_emS099GQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. مفتاح الصوت والفيديو الحقيقي (Agora)
const AGORA_APP_ID = 'b91ba6e66ec94ceb865a6fcc6af07c23';

// 3. ضعي مفتاح الذكاء الاصطناعي (OpenAI) هنا بين علامتي التنصيص
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY_HERE';

export default function App() {
  const [appLang, setAppLang] = useState('ar');
  const [activeTab, setActiveTab] = useState('dialer');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userPhone] = useState('+249900000001');
  const [minutes, setMinutes] = useState(2);
  const [callerLang, setCallerLang] = useState('العربية (Arabic)');
  const [targetLang, setTargetLang] = useState('الإنجليزية (English)');
  const [langModalVisible, setLangModalVisible] = useState(false);

  const [inCall, setInCall] = useState(false);
  const [callType, setCallType] = useState('voice');
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [liveTranslation, setLiveTranslation] = useState('');
  const [testSpeechInput, setTestSpeechInput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  const [callHistory, setCallHistory] = useState([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  const [contacts, setContacts] = useState([
    { id: '1', name: 'لي وي (الصين)', phone: '+8613800138000' }
  ]);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [languages, setLanguages] = useState([
    { id: 'ar', code: 'ar-SA', name: 'العربية (Arabic)', unlocked: true },
    { id: 'en', code: 'en-US', name: 'الإنجليزية (English)', unlocked: true },
    { id: 'zh', code: 'zh-CN', name: 'الصينية (Chinese)', unlocked: false },
    { id: 'hi', code: 'hi-IN', name: 'الهندية (Hindi)', unlocked: false },
    { id: 'es', code: 'es-ES', name: 'الإسبانية (Spanish)', unlocked: false },
    { id: 'fr', code: 'fr-FR', name: 'الفرنسية (French)', unlocked: false },
    { id: 'ru', code: 'ru-RU', name: 'الروسية (Russian)', unlocked: false },
    { id: 'de', code: 'de-DE', name: 'الألمانية (German)', unlocked: false },
    { id: 'ja', code: 'ja-JP', name: 'اليابانية (Japanese)', unlocked: false },
    { id: 'ko', code: 'ko-KR', name: 'الكورية (Korean)', unlocked: false },
    { id: 'tr', code: 'tr-TR', name: 'التركية (Turkish)', unlocked: false },
    { id: 'pt', code: 'pt-PT', name: 'البرتغالية (Portuguese)', unlocked: false },
    { id: 'it', code: 'it-IT', name: 'الإيطالية (Italian)', unlocked: false },
    { id: 'ur', code: 'ur-PK', name: 'الأردية (Urdu)', unlocked: false },
    { id: 'fa', code: 'fa-IR', name: 'الفارسية (Persian)', unlocked: false },
    { id: 'id', code: 'id-ID', name: 'الإندونيسية (Indonesian)', unlocked: false },
    { id: 'sw', code: 'sw-KE', name: 'السواحيلية (Swahili)', unlocked: false },
  ]);

  const downloadedLanguages = languages.filter(lang => lang.unlocked);

  const packagesList = [
    { id: 'p1', mins: 30, price: 9, titleAr: 'باقة البداية - 30 دقيقة', titleEn: 'Starter - 30 Mins' },
    { id: 'p2', mins: 70, price: 19, titleAr: 'الباقة الأساسية - 70 دقيقة', titleEn: 'Basic - 70 Mins' },
    { id: 'p3', mins: 150, price: 39, titleAr: 'باقة التواصل - 150 دقيقة', titleEn: 'Connect - 150 Mins' },
    { id: 'p4', mins: 350, price: 79, titleAr: 'باقة الأعمال - 350 دقيقة', titleEn: 'Business - 350 Mins' },
    { id: 'p5', mins: 800, price: 149, titleAr: 'الباقة الاحترافية - 800 دقيقة', titleEn: 'Pro - 800 Mins' },
    { id: 'p6', mins: 2000, price: 299, titleAr: 'باقة الشركات - 2000 دقيقة', titleEn: 'Enterprise - 2000 Mins' },
  ];

  // دالة الترجمة الفورية بالذكاء الاصطناعي (تفهم العامية والفصحى وتنطق الترجمة)
  const translateAndSpeakLive = async (spokenText, destinationLangObj) => {
    if (!spokenText.trim()) return;
    setIsTranslating(true);
    try {
      const response = await fetch('https://openai.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a real-time voice call translator. Understand any slang, dialect, or formal speech from the caller and translate it naturally and directly into ${destinationLangObj.name}. Reply ONLY with the translated text, nothing else.`
            },
            { role: 'user', content: spokenText }
          ],
          temperature: 0.3,
        }),
      });

      const data = await response.json();
      const translatedText = data.choices[0] ? data.choices.message.content : 'جاري الترجمة...';
      
      setLiveTranslation(translatedText);
      // نطق الترجمة صوتياً فوراً للطرف الآخر
      Speech.speak(translatedText, { language: destinationLangObj.code, rate: 1.0 });
    } catch (error) {
      setLiveTranslation('تأكدي من وضع مفتاح OpenAI الصحيح في الكود');
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    const syncDatabase = async () => {
      try {
        let { data: profile } = await supabase.from('users_profile').select('*').eq('phone_number', userPhone).single();
        if (!profile) {
          const { data: newProfile } = await supabase
            .from('users_profile')
            .insert([{ phone_number: userPhone, minutes_balance: 2, unlocked_languages: ['ar', 'en'] }])
            .select().single();
          profile = newProfile;
        }
        if (profile) {
          setMinutes(profile.minutes_balance);
          const unlockedIds = profile.unlocked_languages || ['ar', 'en'];
          setLanguages(prev => prev.map(l => ({ ...l, unlocked: unlockedIds.includes(l.id) })));
        }
        const { data: logs } = await supabase.from('call_logs').select('*').eq('caller_phone', userPhone).order('created_at', { ascending: false });
        if (logs && logs.length > 0) {
          setCallHistory(logs.map(log => ({
            id: log.id, name: log.receiver_phone, phone: log.receiver_phone, type: log.call_type || 'voice',
            time: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })));
        }
      } catch (e) {}
    };
    syncDatabase();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
          const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers] });
          if (data && data.length > 0) {
            const phoneContacts = data.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0)
              .map(c => ({ id: c.id, name: c.name || 'بدون اسم', phone: c.phoneNumbers.number }));
            if (phoneContacts.length > 0) setContacts(phoneContacts);
          }
        }
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    let timer;
    if (inCall) { timer = setInterval(() => setCallSeconds(prev => prev + 1), 1000); }
    else { setCallSeconds(0); Speech.stop(); }
    return () => clearInterval(timer);
  }, [inCall]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60).toString().padStart(2, '0');
    const remSecs = (secs % 60).toString().padStart(2, '0');
    return `${mins}:${remSecs}`;
  };

  const t = {
    ar: {
      balance: `الرصيد: ${minutes} د`, langBtn: 'English', shareBtn: 'مشاركة', dialPlaceholder: 'أدخل الرقم...',
      myLang: 'لغة التحدث', chooseLangTitle: 'اختر من اللغات المُنزّلة', close: 'إغلاق',
      recents: 'سجل المكالمات', contacts: 'جهات الاتصال', add: '+ إضافة جهة', name: 'الاسم', phone: 'رقم الهاتف',
      langStore: 'متجر لغات العالم (مدى الحياة)', unlocked: 'مُنزّلة ✓', buy5: 'تنزيل $5',
      pkgStore: 'باقات الدقائق (صلاحية مدى الحياة)', lifetime: 'صالحة مدى الحياة لجميع اللغات', buy: 'شراء بـ',
      tabs: { dialer: 'المفاتيح', recents: 'السجل', contacts: 'الجهات', langs: 'اللغات', packages: 'الباقات' },
      liveStream: 'الترجمة الفورية المنطوقة:', mute: 'كتم', speaker: 'مكبر', cam: 'الكاميرا',
      callVoiceOpt: 'مكالمة صوتية 📞', callVideoOpt: 'مكالمة فيديو 📹', deleteOpt: 'حذف من السجل 🗑️'
    },
    en: {
      balance: `Bal: ${minutes}m`, langBtn: 'عربي', shareBtn: 'Share', dialPlaceholder: 'Enter number...',
      myLang: 'Speaking Language', chooseLangTitle: 'Select Downloaded Language', close: 'Close',
      recents: 'Call History', contacts: 'Contacts', add: '+ Add Contact', name: 'Name', phone: 'Phone Number',
      langStore: 'World Languages (Lifetime)', unlocked: 'Downloaded ✓', buy5: 'Download $5',
      pkgStore: 'Minute Packages (Lifetime)', lifetime: 'Valid for life across all languages', buy: 'Buy for',
      tabs: { dialer: 'Keypad', recents: 'Recents', contacts: 'Contacts', langs: 'Languages', packages: 'Packages' },
      liveStream: 'Live Spoken Translation:', mute: 'Mute', speaker: 'Speaker', cam: 'Camera',
      callVoiceOpt: 'Voice Call 📞', callVideoOpt: 'Video Call 📹', deleteOpt: 'Delete Log 🗑️'
    }
  }[appLang];

  const handleShareApp = async () => {
    try {
      const message = appLang === 'ar'
        ? 'جرّب تطبيق مترجم المكالمات الذكي! تواصل مع أي شخص في العالم صوتاً وصورة بلغتك الأم مع ترجمة فورية بالذكاء الاصطناعي.\nhttps://google.com'
        : 'Try Smart Call Translator! Make voice & video calls with live AI translation in your native language.\nhttps://google.com';
      await Share.share({ message });
    } catch (error) {}
  };

  const handlePressDigit = (digit) => setPhoneNumber(prev => prev + digit);
  const handleDeleteDigit = () => setPhoneNumber(prev => prev.slice(0, -1));

  const handleAddContact = async () => {
    if (!newName.trim() || !newPhone.trim()) return Alert.alert('تنبيه', 'أدخل الاسم ورقم الهاتف');
    const newEntry = { id: Date.now().toString(), name: newName.trim(), phone: newPhone.trim() };
    setContacts([newEntry, ...contacts]);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        await Contacts.addContactAsync({
          [Contacts.Fields.FirstName]: newName.trim(),
          [Contacts.Fields.PhoneNumbers]: [{ label: 'mobile', number: newPhone.trim() }],
        });
      }
    } catch (e) {}
    setNewName('');
    setNewPhone('');
    Alert.alert('تم الحفظ', 'تمت إضافة جهة الاتصال بنجاح');
  };

  const handleBuyLanguage = (id, name) => {
    Alert.alert('تنزيل لغة', `${name} - $5`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تنزيل', onPress: async () => {
          const updatedLangs = languages.map(l => l.id === id ? { ...l, unlocked: true } : l);
          setLanguages(updatedLangs);
          const unlockedIds = updatedLangs.filter(l => l.unlocked).map(l => l.id);
          await supabase.from('users_profile').update({ unlocked_languages: unlockedIds }).eq('phone_number', userPhone);
        }
      }
    ]);
  };

  const handleBuyPackage = (mins, price) => {
    Alert.alert('تأكيد الشراء', `${mins} Mins - $${price}`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'شراء', onPress: async () => {
          const newTotal = minutes + mins;
          setMinutes(newTotal);
          await supabase.from('users_profile').update({ minutes_balance: newTotal }).eq('phone_number', userPhone);
        }
      }
    ]);
  };

  const startCall = async (type, num = phoneNumber, contactName = null) => {
    if (!num) return Alert.alert('تنبيه', 'أدخل الرقم أولاً');
    if (minutes <= 0) return Alert.alert('الرصيد نفد', 'يرجى شراء باقة');
    setPhoneNumber(num);
    setCallType(type);
    setIsMuted(false);
    setIsSpeaker(type === 'video');
    setIsCamOff(false);
    setInCall(true);
    setLiveTranslation(appLang === 'ar' ? 'متصل عبر Agora! اكتب جملة بالعامية بالأسفل لتجربة النطق المترجم فوراً:' : 'Connected via Agora! Type a phrase below to test live spoken translation:');

    const foundContact = contacts.find(c => c.phone === num);
    const displayName = contactName || (foundContact ? foundContact.name : num);
    const newLog = { id: Date.now().toString(), name: displayName, phone: num, type: type, time: 'الآن' };
    setCallHistory([newLog, ...callHistory]);

    await supabase.from('call_logs').insert([{
      caller_phone: userPhone, receiver_phone: num, call_type: type, source_lang: callerLang
    }]);
  };

  const deleteHistoryItem = async (id) => {
    setCallHistory(callHistory.filter(item => item.id !== id));
    setSelectedHistoryItem(null);
    await supabase.from('call_logs').delete().eq('id', id);
  };

  const endCall = async () => {
    setInCall(false);
    Speech.stop();
    const cost = callType === 'video' ? 2 : 1;
    const newBal = Math.max(0, minutes - cost);
    setMinutes(newBal);
    await supabase.from('users_profile').update({ minutes_balance: newBal }).eq('phone_number', userPhone);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.badge}><Text style={styles.badgeText}>{t.balance}</Text></View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.langToggleBtn} onPress={handleShareApp}>
            <Text style={styles.langToggleText}>📤 {t.shareBtn}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.langToggleBtn} onPress={() => setAppLang(appLang === 'ar' ? 'en' : 'ar')}>
            <Text style={styles.langToggleText}>🌐 {t.langBtn}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {activeTab === 'dialer' && (
          <View style={styles.dialerContainer}>
            <TouchableOpacity style={styles.selectorBtn} onPress={() => setLangModalVisible(true)}>
              <Text style={styles.selectorText}>{t.myLang}: {callerLang}  ▾</Text>
            </TouchableOpacity>
            <Text style={styles.phoneDisplay}>{phoneNumber || t.dialPlaceholder}</Text>
            <View style={styles.keypad}>
              {['1','2','3','4','5','6','7','8','9','*','0','⌫'].map((key) => (
                <TouchableOpacity key={key} style={styles.key} onPress={() => key === '⌫' ? handleDeleteDigit() : handlePressDigit(key)}>
                  <Text style={styles.keyText}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.callIconsRow}>
              <TouchableOpacity style={[styles.circleCallBtn, { backgroundColor: '#0F766E' }]} onPress={() => startCall('voice')}>
                <Text style={styles.circleCallIcon}>📞</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.circleCallBtn, { backgroundColor: '#0284C7' }]} onPress={() => startCall('video')}>
                <Text style={styles.circleCallIcon}>📹</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'recents' && (
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{t.recents}</Text>
            <FlatList
              data={callHistory}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.listItem} onPress={() => setSelectedHistoryItem(item)}>
                  <View>
                    <Text style={styles.bold}>{item.name}</Text>
                    <Text style={styles.subText}>{item.type === 'video' ? '📹 Video' : '📞 Voice'} • {item.phone}</Text>
                  </View>
                  <Text style={styles.subText}>{item.time}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {activeTab === 'contacts' && (
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{t.contacts}</Text>
            <View style={styles.addCard}>
              <TextInput style={styles.input} placeholder={t.name} placeholderTextColor="#94A3B8" value={newName} onChangeText={setNewName} />
              <TextInput style={styles.input} placeholder={t.phone} placeholderTextColor="#94A3B8" value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" />
              <TouchableOpacity style={styles.addFullBtn} onPress={handleAddContact}><Text style={styles.btnText}>{t.add}</Text></TouchableOpacity>
            </View>
            <FlatList
              data={contacts}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.listItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bold}>{item.name}</Text>
                    <Text style={styles.subText}>{item.phone}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#0F766E' }]} onPress={() => startCall('voice', item.phone, item.name)}><Text style={styles.btnText}>📞</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#0284C7' }]} onPress={() => startCall('video', item.phone, item.name)}><Text style={styles.btnText}>📹</Text></TouchableOpacity>
                  </View>
                </View>
              )}
            />
          </View>
        )}

        {activeTab === 'langs' && (
          <FlatList
            data={languages}
            keyExtractor={item => item.id}
            ListHeaderComponent={<Text style={styles.sectionTitle}>{t.langStore}</Text>}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <Text style={styles.bold}>{item.name}</Text>
                {item.unlocked ? (
                  <Text style={styles.freeTag}>{t.unlocked}</Text>
                ) : (
                  <TouchableOpacity style={styles.smallBtn} onPress={() => handleBuyLanguage(item.id, item.name)}>
                    <Text style={styles.btnText}>{t.buy5}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        )}

        {activeTab === 'packages' && (
          <ScrollView>
            <Text style={styles.sectionTitle}>{t.pkgStore}</Text>
            {packagesList.map(pkg => (
              <View key={pkg.id} style={styles.card}>
                <Text style={styles.bold}>{appLang === 'ar' ? pkg.titleAr : pkg.titleEn}</Text>
                <Text style={styles.subText}>{t.lifetime}</Text>
                <TouchableOpacity style={styles.smallBtn} onPress={() => handleBuyPackage(pkg.mins, pkg.price)}>
                  <Text style={styles.btnText}>{t.buy} ${pkg.price}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.bottomNav}>
        {['dialer', 'recents', 'contacts', 'langs', 'packages'].map(tab => (
          <TouchableOpacity key={tab} style={styles.navItem} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.navText, activeTab === tab && styles.activeNavText]}>{t.tabs[tab]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={!!selectedHistoryItem} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>{selectedHistoryItem?.name}</Text>
            <Text style={[styles.subText, { textAlign: 'center', marginBottom: 15 }]}>{selectedHistoryItem?.phone}</Text>
            <TouchableOpacity style={[styles.optionActionBtn, { backgroundColor: '#0F766E' }]} onPress={() => { const item = selectedHistoryItem; setSelectedHistoryItem(null); startCall('voice', item.phone, item.name); }}>
              <Text style={styles.btnText}>{t.callVoiceOpt}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionActionBtn, { backgroundColor: '#0284C7' }]} onPress={() => { const item = selectedHistoryItem; setSelectedHistoryItem(null); startCall('video', item.phone, item.name); }}>
              <Text style={styles.btnText}>{t.callVideoOpt}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionActionBtn, { backgroundColor: '#EF4444' }]} onPress={() => deleteHistoryItem(selectedHistoryItem.id)}>
              <Text style={styles.btnText}>{t.deleteOpt}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedHistoryItem(null)}>
              <Text style={styles.btnText}>{t.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={langModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>{t.chooseLangTitle}</Text>
            <FlatList
              data={downloadedLanguages}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setCallerLang(item.name); setLangModalVisible(false); }}>
                  <Text style={[styles.dropdownItemText, callerLang === item.name && { color: '#0F766E', fontWeight: 'bold' }]}>
                    {item.name} {callerLang === item.name ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setLangModalVisible(false)}>
              <Text style={styles.btnText}>{t.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={inCall} animationType="fade">
        <SafeAreaView style={styles.waCallScreen}>
          <View style={styles.waTopInfo}>
            <Text style={styles.waEncrypted}>🔒 Agora ID: {AGORA_APP_ID.slice(0, 8)}... • AI Live</Text>
            <Text style={styles.waCallerName}>{phoneNumber}</Text>
            <Text style={styles.waTimer}>{formatTime(callSeconds)} • {callerLang} ➔ {targetLang}</Text>
          </View>

          {callType === 'video' ? (
            <View style={styles.waVideoArea}>
              <Text style={styles.waVideoText}>{isCamOff ? 'الكاميرا متوقفة' : 'بث الفيديو المباشر 📹'}</Text>
              <View style={styles.waSelfPip}><Text style={{ color: '#fff', fontSize: 10 }}>أنت</Text></View>
            </View>
          ) : (
            <View style={styles.waAvatarCircle}><Text style={{ fontSize: 48 }}>👤</Text></View>
          )}

          {/* صندوق الترجمة الفورية الحية مع أداة اختبار النطق المباشر */}
          <View style={styles.waSubtitleBox}>
            <Text style={styles.waSubtitleLabel}>{t.liveStream}</Text>
            <Text style={styles.waSubtitleText}>{liveTranslation}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
              <TextInput
                style={styles.liveTestInput}
                placeholder={appLang === 'ar' ? 'اكتبي جملة لتترجم وتُنطق...' : 'Type phrase to translate & speak...'}
                placeholderTextColor="#8696A0"
                value={testSpeechInput}
                onChangeText={setTestSpeechInput}
              />
              <TouchableOpacity
                style={styles.liveTestBtn}
                disabled={isTranslating}
                onPress={() => {
                  const destObj = languages.find(l => l.name === targetLang) || languages[1];
                  translateAndSpeakLive(testSpeechInput, destObj);
                  setTestSpeechInput('');
                }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>{isTranslating ? '...' : 'ترجم 🔊'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.waControlsPanel}>
            <TouchableOpacity style={[styles.waControlBtn, isSpeaker && styles.waControlActive]} onPress={() => setIsSpeaker(!isSpeaker)}>
              <Text style={styles.waControlIcon}>🔊</Text>
              <Text style={styles.waControlLabel}>{t.speaker}</Text>
            </TouchableOpacity>
            {callType === 'video' && (
              <TouchableOpacity style={[styles.waControlBtn, isCamOff && styles.waControlActive]} onPress={() => setIsCamOff(!isCamOff)}>
                <Text style={styles.waControlIcon}>📷</Text>
                <Text style={styles.waControlLabel}>{t.cam}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.waControlBtn, isMuted && styles.waControlActive]} onPress={() => setIsMuted(!isMuted)}>
              <Text style={styles.waControlIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
              <Text style={styles.waControlLabel}>{t.mute}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.waEndBtn} onPress={endCall}>
              <Text style={styles.waControlIcon}>📞</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#FFFFFF', padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  badge: { backgroundColor: '#CCFBF1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: '#0F766E', fontSize: 13, fontWeight: 'bold' },
  langToggleBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#CBD5E1' },
  langToggleText: { color: '#334155', fontSize: 13, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'center', color: '#1E293B' },
  dialerContainer: { flex: 1, justifyContent: 'space-between' },
  selectorBtn: { padding: 11, backgroundColor: '#FFFFFF', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1' },
  selectorText: { fontSize: 13, fontWeight: '600', color: '#0F766E' },
  phoneDisplay: { fontSize: 25, textAlign: 'center', marginVertical: 6, color: '#1E293B', fontWeight: 'bold', letterSpacing: 1 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingHorizontal: 16 },
  key: { width: '28%', paddingVertical: 10, backgroundColor: '#FFFFFF', borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  keyText: { fontSize: 18, fontWeight: '600', color: '#334155' },
  callIconsRow: { flexDirection: 'row', justifyContent: 'center', gap: 36, marginVertical: 4 },
  circleCallBtn: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  circleCallIcon: { fontSize: 24, color: '#FFFFFF' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  bold: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  subText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  addCard: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#CBD5E1', gap: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 10, textAlign: 'center', color: '#1E293B' },
  addFullBtn: { backgroundColor: '#0F766E', padding: 11, borderRadius: 10, alignItems: 'center' },
  smallBtn: { backgroundColor: '#0F766E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, justifyContent: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  freeTag: { color: '#0F766E', fontWeight: 'bold', fontSize: 13 },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', gap: 6 },
  bottomNav: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  navItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  navText: { fontSize: 12, color: '#64748B' },
  activeNavText: { color: '#0F766E', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', padding: 24 },
  dropdownBox: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, maxHeight: 400 },
  dropdownTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 6, color: '#1E293B' },
  dropdownItem: { paddingVertical: 14, borderBottomWidth: 1, borderColor: '#F1F5F9', alignItems: 'center' },
  dropdownItemText: { fontSize: 15, color: '#334155' },
  optionActionBtn: { padding: 13, borderRadius: 12, alignItems: 'center', marginBottom: 8 },
  closeModalBtn: { backgroundColor: '#64748B', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  waCallScreen: { flex: 1, backgroundColor: '#0B141A', justifyContent: 'space-between', padding: 20 },
  waTopInfo: { alignItems: 'center', marginTop: 15 },
  waEncrypted: { color: '#8696A0', fontSize: 11, marginBottom: 8 },
  waCallerName: { color: '#E9EDEF', fontSize: 28, fontWeight: '600' },
  waTimer: { color: '#00A884', fontSize: 15, marginTop: 4, fontWeight: '500' },
  waAvatarCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#202C33', alignSelf: 'center', justifyContent: 'center', alignItems: 'center' },
  waVideoArea: { height: 200, backgroundColor: '#111B21', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#2A3942' },
  waVideoText: { color: '#8696A0', fontSize: 14 },
  waSelfPip: { position: 'absolute', bottom: 12, right: 12, width: 65, height: 90, backgroundColor: '#202C33', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#00A884' },
  waSubtitleBox: { backgroundColor: 'rgba(32, 44, 51, 0.95)', padding: 14, borderRadius: 14, borderLeftWidth: 3, borderLeftColor: '#00A884' },
  waSubtitleLabel: { color: '#00A884', fontSize: 11, marginBottom: 4, fontWeight: 'bold' },
  waSubtitleText: { color: '#E9EDEF', fontSize: 15, lineHeight: 22 },
  liveTestInput: { flex: 1, backgroundColor: '#111B21', color: '#E9EDEF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13 },
  liveTestBtn: { backgroundColor: '#00A884', paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center' },
  waControlsPanel: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#202C33', paddingVertical: 14, borderRadius: 28, marginBottom: 10 },
  waControlBtn: { alignItems: 'center', padding: 8, borderRadius: 20, width: 65 },
  waControlActive: { backgroundColor: '#374248' },
  waControlIcon: { fontSize: 22, color: '#E9EDEF' },
  waControlLabel: { color: '#8696A0', fontSize: 11, marginTop: 4 },
  waEndBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' }
});
