import React, { useState, useMemo, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, Keyboard, TouchableWithoutFeedback, Alert,
  ScrollView, ActivityIndicator, Modal, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { subDays, startOfMonth, isWithinInterval } from 'date-fns';
import * as Notifications from 'expo-notifications';

// BİLDİRİM AYARI
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// PARA BİRİMİ FORMATLAMA FONKSİYONU
const formatCurrency = (number) => {
  const roundedUpValue = Math.ceil(number || 0);
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedUpValue);
};

//=================================
// TODAY SCREEN COMPONENT
//=================================
const getTodayDateString = () => new Date().toISOString().split('T')[0];

function TodayScreen() {
  const [today, setToday] = useState(getTodayDateString());
  const [startKm, setStartKm] = useState('');
  const [endKm, setEndKm] = useState('');
  const [yakitMaliyeti, setYakitMaliyeti] = useState('4.0');
  const [kazanclar, setKazanclar] = useState([]);
  const [ekstraMasraflar, setEkstraMasraflar] = useState([]);
  const [inputTutar, setInputTutar] = useState('');
  const [inputNot, setInputNot] = useState('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isKmSectionVisible, setIsKmSectionVisible] = useState(false);
  const [isRecordSectionVisible, setIsRecordSectionVisible] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsDataLoaded(false);
      const todayStorageKey = `@TagziApp:data_${today}`;
      try {
        const savedDataString = await AsyncStorage.getItem(todayStorageKey);
        if (savedDataString !== null) {
          const savedData = JSON.parse(savedDataString);
          setStartKm(savedData.startKm || '');
          setEndKm(savedData.endKm || '');
          setYakitMaliyeti(savedData.yakitMaliyeti || '4.0');
          setKazanclar(savedData.kazanclar || []);
          setEkstraMasraflar(savedData.ekstraMasraflar || []);
        } else {
          setStartKm(''); setEndKm(''); setKazanclar([]); setEkstraMasraflar([]);
        }
      } catch (e) { console.error('Failed to load data', e); } 
      finally { setIsDataLoaded(true); }
    };
    loadData();
  }, [today]);

  useEffect(() => {
    if (!isDataLoaded) return;
    const saveData = async () => {
      const todayStorageKey = `@TagziApp:data_${today}`;
      try {
        const dataToSave = { startKm, endKm, yakitMaliyeti, kazanclar, ekstraMasraflar };
        const dataString = JSON.stringify(dataToSave);
        await AsyncStorage.setItem(todayStorageKey, dataString);
      } catch (e) { console.error('Failed to save data', e); }
    };
    saveData();
  }, [startKm, endKm, yakitMaliyeti, kazanclar, ekstraMasraflar, isDataLoaded, today]);

  const handleEndDay = () => Alert.alert("Günü Bitir", "Bugünkü veriler kaydedilecek ve ekran yeni bir gün için sıfırlanacak. Emin misiniz?", [{ text: "İptal", style: "cancel" }, { text: "Evet, Bitir", onPress: () => { setStartKm(''); setEndKm(''); setKazanclar([]); setEkstraMasraflar([]); setInputTutar(''); setInputNot(''); setToday(getTodayDateString()); Alert.alert("Gün Bitti", "Verileriniz kaydedildi. Ekran yeni gün için hazır!"); }, style: "destructive" }]);
  const handleKayitEkle = (tip) => { const tutar = parseFloat(inputTutar); if (!tutar || tutar <= 0) { Alert.alert('Hata', 'Lütfen geçerli bir tutar girin.'); return; } const yeniKayit = { id: Date.now().toString(), tutar, not: inputNot }; if (tip === 'kazanc') { setKazanclar(onceki => [yeniKayit, ...onceki]); } else { setEkstraMasraflar(onceki => [yeniKayit, ...onceki]); } setInputTutar(''); setInputNot(''); Keyboard.dismiss(); };
  const gunlukOzet = useMemo(() => { const baslangic = parseFloat(startKm) || 0; const bitis = parseFloat(endKm) || 0; const maliyetPerKm = parseFloat(yakitMaliyeti.replace(',', '.')) || 0; const toplamKm = bitis > baslangic ? bitis - baslangic : 0; const yakitMasrafi = toplamKm * maliyetPerKm; const toplamKazanc = kazanclar.reduce((acc, val) => acc + val.tutar, 0); const toplamEkstraMasraf = ekstraMasraflar.reduce((acc, val) => acc + val.tutar, 0); const toplamMasraf = yakitMasrafi + toplamEkstraMasraf; const netKar = toplamKazanc - toplamMasraf; return { toplamKm, yakitMasrafi, toplamKazanc, toplamEkstraMasraf, toplamMasraf, netKar }; }, [startKm, endKm, yakitMaliyeti, kazanclar, ekstraMasraflar]);

  const renderKayit = ({ item, tip }) => (<View style={styles.kayitItem}><Text style={[styles.kayitTutar, { color: tip === 'kazanc' ? '#2ecc71' : '#e74c3c' }]}>{tip === 'kazanc' ? '+ ' : '- '}{formatCurrency(item.tutar)}</Text>{item.not ? <Text style={styles.notText}>{item.not}</Text> : null}</View>);
  return (<TouchableWithoutFeedback onPress={Keyboard.dismiss}><SafeAreaView style={styles.container}><FlatList keyboardShouldPersistTaps="handled" ListHeaderComponent={<><View style={styles.ozetKarti}><Text style={styles.ozetLabel}>GÜN SONU NET KÂR</Text><Text style={styles.netKarText}>{formatCurrency(gunlukOzet.netKar)}</Text><View style={styles.separator} /><OzetSatiri label="Toplam Kazanç:" deger={formatCurrency(gunlukOzet.toplamKazanc)} renk="#2ecc71" /><OzetSatiri label="Toplam Masraf:" deger={formatCurrency(gunlukOzet.toplamMasraf)} renk="#e74c3c" /><Text style={styles.masrafDetay}> (Yakıt: {formatCurrency(gunlukOzet.yakitMasrafi)} + Ekstra: {formatCurrency(gunlukOzet.toplamEkstraMasraf)})</Text><OzetSatiri label="Toplam Yol:" deger={`${gunlukOzet.toplamKm.toFixed(1)} km`} /></View><View style={styles.formKarti}><TouchableOpacity style={styles.collapsibleHeader} onPress={() => setIsKmSectionVisible(!isKmSectionVisible)}><Text style={styles.formBaslik}>Kilometre ve Yakıt</Text><Ionicons name={isKmSectionVisible ? "chevron-up" : "chevron-down"} size={24} color="white" /></TouchableOpacity>{isKmSectionVisible && (<View style={styles.collapsibleContent}><View style={{ flexDirection: 'row' }}><InputGrup etiket="Gün Başı KM" value={startKm} onChangeText={setStartKm} placeholder="150000" /><InputGrup etiket="Gün Sonu KM" value={endKm} onChangeText={setEndKm} placeholder="150250" /></View><InputGrup etiket="KM Başına Yakıt Maliyeti (TL)" value={yakitMaliyeti} onChangeText={setYakitMaliyeti} /></View>)}</View><View style={styles.formKarti}><TouchableOpacity style={styles.collapsibleHeader} onPress={() => setIsRecordSectionVisible(!isRecordSectionVisible)}><Text style={styles.formBaslik}>Yeni Kayıt Ekle</Text><Ionicons name={isRecordSectionVisible ? "chevron-up" : "chevron-down"} size={24} color="white" /></TouchableOpacity>{isRecordSectionVisible && (<View style={styles.collapsibleContent}><InputGrup etiket="Tutar (TL)" value={inputTutar} onChangeText={setInputTutar} placeholder="Örn: 150" /><InputGrup etiket="Not (İsteğe Bağlı)" value={inputNot} onChangeText={setInputNot} placeholder="Yolcu, Yemek, Yıkama..." /><View style={{ flexDirection: 'row', marginTop: 10 }}><TouchableOpacity style={[styles.button, { flex: 1, marginRight: 5, backgroundColor: '#2ecc71' }]} onPress={() => handleKayitEkle('kazanc')}><Text style={styles.buttonText}>KAZANÇ</Text></TouchableOpacity><TouchableOpacity style={[styles.button, { flex: 1, marginLeft: 5, backgroundColor: '#e74c3c' }]} onPress={() => handleKayitEkle('masraf')}><Text style={styles.buttonText}>MASRAF</Text></TouchableOpacity></View></View>)}</View><View style={styles.listelerContainer}><ListeKolonu baslik="Kazançlar" data={kazanclar} renderItem={({ item }) => renderKayit({ item, tip: 'kazanc' })} /><ListeKolonu baslik="Ekstra Masraflar" data={ekstraMasraflar} renderItem={({ item }) => renderKayit({ item, tip: 'masraf' })} /></View><TouchableOpacity style={styles.endDayButton} onPress={handleEndDay}><Ionicons name="archive-outline" size={20} color="white" /><Text style={styles.endDayButtonText}>Günü Bitir ve Sıfırla</Text></TouchableOpacity></>} /></SafeAreaView></TouchableWithoutFeedback>);
}
const OzetSatiri = ({ label, deger, renk }) => (<View style={styles.ozetSatiri}><Text style={styles.ozetLabel}>{label}</Text><Text style={[styles.ozetDeger, { color: renk || '#fff' }]}>{deger}</Text></View>);
const InputGrup = ({ etiket, ...props }) => (<View style={{ marginBottom: 10, flex: 1, paddingHorizontal: 4 }}><Text style={styles.inputLabel}>{etiket}</Text><TextInput style={styles.input} keyboardType="numeric" placeholderTextColor="#aaa" {...props} /></View>);
const ListeKolonu = ({ baslik, ...props }) => (<View style={{ flex: 1 }}><Text style={styles.listeBaslik}>{baslik}</Text><FlatList {...props} /></View>);

//=================================
// HISTORY SCREEN COMPONENT
//=================================
const SummaryBox = ({ label, value }) => (<View style={styles.summaryBox}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{formatCurrency(value)}</Text></View>);
function HistoryScreen({ navigation }) { 
  const [allData, setAllData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(useCallback(() => { const loadAllData = async () => { setIsLoading(true); try { const allKeys = await AsyncStorage.getAllKeys(); const dataKeys = allKeys.filter(key => key.startsWith('@TagziApp:data_')); const dataPairs = await AsyncStorage.multiGet(dataKeys); const parsedData = dataPairs.map(pair => { const date = pair[0].split('_')[1]; if (!pair[1]) return null; const dayData = JSON.parse(pair[1]); const toplamKazanc = (dayData.kazanclar || []).reduce((sum, item) => sum + item.tutar, 0); const baslangic = parseFloat(dayData.startKm) || 0; const bitis = parseFloat(dayData.endKm) || 0; const maliyetPerKm = parseFloat(dayData.yakitMaliyeti) || 0; const toplamKm = bitis > baslangic ? bitis - baslangic : 0; const yakitMasrafi = toplamKm * maliyetPerKm; const toplamEkstraMasraf = (dayData.ekstraMasraflar || []).reduce((sum, item) => sum + item.tutar, 0); const toplamMasraf = yakitMasrafi + toplamEkstraMasraf; const netKar = toplamKazanc - toplamMasraf; return { date, toplamKazanc, netKar }; }).filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date)); setAllData(parsedData); } catch (e) { console.error("Failed to load history data", e); } finally { setIsLoading(false); } }; loadAllData(); }, []));
  const summary = useMemo(() => { const now = new Date(); const last7DaysInterval = { start: subDays(now, 6), end: now }; const thisMonthInterval = { start: startOfMonth(now), end: now }; let totalEarnings = 0, last7DaysEarnings = 0, thisMonthEarnings = 0; for (const day of allData) { const dayDate = new Date(day.date); totalEarnings += day.toplamKazanc; if (isWithinInterval(dayDate, last7DaysInterval)) { last7DaysEarnings += day.toplamKazanc; } if (isWithinInterval(dayDate, thisMonthInterval)) { thisMonthEarnings += day.toplamKazanc; } } return { totalEarnings, last7DaysEarnings, thisMonthEarnings }; }, [allData]);

  if (isLoading) { return <View style={styles.container}><ActivityIndicator size="large" color="#2ecc71" /></View>; }
  const renderHistoryItem = ({ item }) => (<TouchableOpacity style={styles.historyItem} onPress={() => navigation.navigate('DayDetail', { date: item.date })}><Text style={styles.dateText}>{new Date(item.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text><View><Text style={styles.earningsText}>Kazanç: {formatCurrency(item.toplamKazanc)}</Text><Text style={[styles.netProfitText, { color: item.netKar >= 0 ? '#2ecc71' : '#e74c3c' }]}>Net Kâr: {formatCurrency(item.netKar)}</Text></View></TouchableOpacity>);
  return (<SafeAreaView style={styles.container}><View style={styles.summaryContainer}><SummaryBox label="Son 7 Gün" value={summary.last7DaysEarnings} /><SummaryBox label="Bu Ay" value={summary.thisMonthEarnings} /><SummaryBox label="Toplam" value={summary.totalEarnings} /></View><FlatList data={allData} renderItem={renderHistoryItem} keyExtractor={item => item.date} ListEmptyComponent={<Text style={styles.emptyText}>Henüz geçmiş bir kayıt bulunmuyor.</Text>} /></SafeAreaView>);
}
//=================================
// DAY DETAIL SCREEN COMPONENT
//=================================
const KayitItem_detail = ({ item, tip, onEdit }) => (<View style={styles.kayitItem_detail}><View style={{ flex: 1 }}><Text style={[styles.kayitTutar_detail, { color: tip === 'kazanc' ? '#2ecc71' : '#e74c3c' }]}>{tip === 'kazanc' ? '+ ' : '- '}{formatCurrency(item.tutar)}</Text>{item.not ? <Text style={styles.notText_detail}>{item.not}</Text> : null}</View><TouchableOpacity onPress={onEdit} style={styles.editButton_detail}><Ionicons name="pencil-outline" size={20} color="#bdc3c7" /></TouchableOpacity></View>);
const OzetSatiri_detail = ({ label, deger, renk }) => (<View style={styles.ozetSatiri_detail}><Text style={styles.ozetLabel_detail}>{label}</Text><Text style={[styles.ozetDeger_detail, { color: renk || '#fff' }]}>{deger}</Text></View>);

function DayDetailScreen({ route, navigation }) {
  const { date } = route.params; const [dayData, setDayData] = useState(null); const [isLoading, setIsLoading] = useState(true); const [isModalVisible, setIsModalVisible] = useState(false); const [editingItem, setEditingItem] = useState(null); const [editTutar, setEditTutar] = useState(''); const [editNot, setEditNot] = useState('');
  const handleDeleteDay = useCallback(() => { Alert.alert("Kaydı Sil", `${new Date(date).toLocaleDateString('tr-TR')} tarihli kaydı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`, [{ text: "İptal", style: "cancel" }, { text: "Evet, Sil", onPress: async () => { try { const storageKey = `@TagziApp:data_${date}`; await AsyncStorage.removeItem(storageKey); navigation.goBack(); } catch (e) { console.error("Failed to delete data", e); Alert.alert("Hata", "Kayıt silinirken bir sorun oluştu."); } }, style: "destructive", }]); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [navigation, date]); 
  useLayoutEffect(() => { navigation.setOptions({ headerRight: () => (<TouchableOpacity onPress={handleDeleteDay} style={{ marginRight: 15 }}><Ionicons name="trash-outline" size={24} color="#e74c3c" /></TouchableOpacity>), }); }, [navigation, handleDeleteDay]);
  const loadDayData = useCallback(async () => { setIsLoading(true); const storageKey = `@TagziApp:data_${date}`; try { const dataString = await AsyncStorage.getItem(storageKey); if (dataString) { const parsedData = JSON.parse(dataString); const toplamKazanc = (parsedData.kazanclar || []).reduce((sum, item) => sum + item.tutar, 0); const baslangic = parseFloat(parsedData.startKm) || 0; const bitis = parseFloat(parsedData.endKm) || 0; const maliyetPerKm = parseFloat(parsedData.yakitMaliyeti) || 0; const toplamKm = bitis > baslangic ? bitis - baslangic : 0; const yakitMasrafi = toplamKm * maliyetPerKm; const toplamEkstraMasraf = (parsedData.ekstraMasraflar || []).reduce((sum, item) => sum + item.tutar, 0); const toplamMasraf = yakitMasrafi + toplamEkstraMasraf; const netKar = toplamKazanc - toplamMasraf; setDayData({ ...parsedData, toplamKazanc, toplamMasraf, toplamKm, netKar }); } } catch (e) { console.error("Failed to load day data", e); } finally { setIsLoading(false); } }, [date]);
  useEffect(() => { loadDayData(); }, [loadDayData]);
  const openEditModal = useCallback((item, tip) => { setEditingItem({ ...item, tip }); setEditTutar(item.tutar.toString()); setEditNot(item.not || ''); setIsModalVisible(true); }, []);
  const handleSaveChanges = useCallback(async () => { if (!editingItem || !editTutar) { Alert.alert("Hata", "Tutar boş bırakılamaz."); return; } const updatedDayData = JSON.parse(JSON.stringify(dayData)); const listToUpdate = editingItem.tip === 'kazanc' ? updatedDayData.kazanclar : updatedDayData.ekstraMasraflar; const itemIndex = listToUpdate.findIndex(item => item.id === editingItem.id); if (itemIndex > -1) { listToUpdate[itemIndex].tutar = parseFloat(editTutar.replace(',', '.')) || 0; listToUpdate[itemIndex].not = editNot; } try { const storageKey = `@TagziApp:data_${date}`; await AsyncStorage.setItem(storageKey, JSON.stringify(updatedDayData)); await loadDayData(); setIsModalVisible(false); setEditingItem(null); } catch (e) { console.error("Failed to save edited data", e); Alert.alert("Hata", "Değişiklikler kaydedilirken bir sorun oluştu."); } }, [editingItem, editTutar, editNot, dayData, date, loadDayData]);
  
  if (isLoading) { return <View style={styles.container}><ActivityIndicator size="large" color="#2ecc71" /></View>; }
  if (!dayData) { return <View style={styles.container}><Text style={styles.dateText_detail}>Bu tarihe ait veri bulunamadı.</Text></View>; }
  return (<SafeAreaView style={styles.container}><ScrollView><View style={styles.ozetKarti_detail}><OzetSatiri_detail label="Net Kâr:" deger={formatCurrency(dayData.netKar)} renk={dayData.netKar >= 0 ? '#2ecc71' : '#e74c3c'}/><View style={styles.separator_detail} /><OzetSatiri_detail label="Toplam Kazanç:" deger={formatCurrency(dayData.toplamKazanc)} /><OzetSatiri_detail label="Toplam Masraf:" deger={formatCurrency(dayData.toplamMasraf)} /><OzetSatiri_detail label="Toplam Yol:" deger={`${dayData.toplamKm.toFixed(1)} km`} /></View><View style={styles.listelerContainer_detail}><View style={{ flex: 1 }}><Text style={styles.listeBaslik_detail}>Kazançlar</Text>{dayData.kazanclar && dayData.kazanclar.length > 0 ? ( dayData.kazanclar.map(item => <KayitItem_detail key={item.id} item={item} tip="kazanc" onEdit={() => openEditModal(item, 'kazanc')}/>)) : ( <Text style={styles.emptyListText_detail}>Kazanç kaydı yok.</Text> )}</View><View style={{ flex: 1 }}><Text style={styles.listeBaslik_detail}>Ekstra Masraflar</Text>{dayData.ekstraMasraflar && dayData.ekstraMasraflar.length > 0 ? ( dayData.ekstraMasraflar.map(item => <KayitItem_detail key={item.id} item={item} tip="masraf" onEdit={() => openEditModal(item, 'masraf')}/>)) : ( <Text style={styles.emptyListText_detail}>Masraf kaydı yok.</Text> )}</View></View></ScrollView><Modal animationType="fade" transparent={true} visible={isModalVisible} onRequestClose={() => setIsModalVisible(false)}><View style={styles.modalContainer_detail}><View style={styles.modalContent_detail}><Text style={styles.modalTitle_detail}>Kaydı Düzenle</Text><TextInput style={styles.input_detail} placeholder="Tutar" keyboardType="numeric" value={editTutar} onChangeText={setEditTutar}/><TextInput style={styles.input_detail} placeholder="Not (isteğe bağlı)" value={editNot} onChangeText={setEditNot}/><View style={styles.modalButtonContainer_detail}><TouchableOpacity style={[styles.button_detail, styles.cancelButton_detail]} onPress={() => setIsModalVisible(false)}><Text style={styles.buttonText_detail}>İptal</Text></TouchableOpacity><TouchableOpacity style={[styles.button_detail, styles.saveButton_detail]} onPress={handleSaveChanges}><Text style={styles.buttonText_detail}>Kaydet</Text></TouchableOpacity></View></View></View></Modal></SafeAreaView>);
}

//=================================
// ANA APP VE NAVIGASYON
//=================================

SplashScreen.preventAutoHideAsync();
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HistoryStack() {
  return (<Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#2c3e50' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: 'bold' }, }}><Stack.Screen name="HistoryList" component={HistoryScreen} options={{ headerShown: false }} /><Stack.Screen name="DayDetail" component={DayDetailScreen} options={{ title: 'Gün Detayı' }} /></Stack.Navigator>);
}

export default function App() {
  useEffect(() => {
    const setup = async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
        
        // Fontlar artık yüklenmediği için bekleme yok, ama açılış ekranı için kısa bir gecikme ekleyebiliriz
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (Platform.OS === 'android') { await Notifications.setNotificationChannelAsync('default', { name: 'default', importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 250, 250, 250], lightColor: '#FF231F7C', }); }
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') { const { status } = await Notifications.requestPermissionsAsync(); finalStatus = status; }
        if (finalStatus !== 'granted') { console.log('Bildirim gönderme izni verilmedi!'); }
        else {
            await Notifications.cancelAllScheduledNotificationsAsync();
            await Notifications.scheduleNotificationAsync({
                content: { title: "Günü kapatma zamanı! 잊", body: 'Bugünkü kayıtlarını Tagzi\'ye eklemeyi unutma.', sound: 'default' },
                trigger: { hour: 22, minute: 0, repeats: true },
            });
            console.log("Günlük hatırlatma kuruldu: Her gün 22:00");
        }
      } catch (e) { console.warn(e); } 
      finally { await SplashScreen.hideAsync(); }
    };
    setup();
  }, []);
  
  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => { let iconName; if (route.name === 'Bugün') { iconName = focused ? 'today' : 'today-outline'; } else if (route.name === 'Geçmiş') { iconName = focused ? 'calendar' : 'calendar-outline'; } return <Ionicons name={iconName} size={size} color={color} />; },
            tabBarActiveTintColor: '#2ecc71',
            tabBarInactiveTintColor: 'gray',
            tabBarStyle: { backgroundColor: '#2c3e50', borderTopColor: '#2c3e50', height: 60, paddingBottom: 5 },
            headerStyle: { backgroundColor: '#2c3e50', height: 110 },
            headerTitleAlign: 'center',
            headerTitleStyle: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
            tabBarLabelStyle: { fontWeight: 'bold' }
          })}
        >
          <Tab.Screen name="Bugün" component={TodayScreen} options={{ headerTitle: 'tagzi' }} />
          <Tab.Screen name="Geçmiş" component={HistoryStack} options={{ headerTitle: 'Geçmiş Kayıtlar' }} />
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
}

//=================================
// BİRLEŞTİRİLMİŞ STİLLER
//=================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e272e', justifyContent: 'center' },
  ozetKarti: { backgroundColor: '#2c3e50', borderRadius: 10, padding: 20, margin: 15 },
  ozetLabel: { color: '#bdc3c7', fontSize: 16 },
  netKarText: { color: '#2ecc71', fontSize: 36, fontWeight: 'bold', marginBottom: 10 },
  ozetSatiri: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  ozetDeger: { fontSize: 16, fontWeight: 'bold' },
  separator: { height: 1, backgroundColor: '#485460', marginVertical: 15 },
  masrafDetay: { fontSize: 12, color: '#95a5a6', textAlign: 'right', marginTop: -4, marginBottom: 8 },
  formKarti: { backgroundColor: '#2c3e50', borderRadius: 10, paddingVertical: 15, paddingHorizontal: 20, marginHorizontal: 15, marginBottom: 15 },
  collapsibleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formBaslik: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  collapsibleContent: { marginTop: 20 },
  inputLabel: { color: '#bdc3c7', fontSize: 14, marginBottom: 5 },
  input: { backgroundColor: '#1e272e', color: 'white', borderRadius: 5, padding: 12, fontSize: 16 },
  button: { paddingVertical: 15, borderRadius: 5, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  listelerContainer: { flexDirection: 'row', paddingHorizontal: 15, marginTop: 10, gap: 10 },
  listeBaslik: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  kayitItem: { backgroundColor: '#34495e', padding: 10, borderRadius: 5, marginBottom: 5 },
  kayitTutar: { fontWeight: 'bold', fontSize: 16 },
  notText: { fontSize: 13, color: '#bdc3c7', marginTop: 3 },
  endDayButton: { backgroundColor: '#c0392b', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 10, marginHorizontal: 15, marginTop: 20, marginBottom: 40 },
  endDayButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  summaryContainer: { flexDirection: 'row', justifyContent: 'space-around', padding: 10 },
  summaryBox: { flex: 1, backgroundColor: '#2c3e50', padding: 15, borderRadius: 10, margin: 5, alignItems: 'center' },
  summaryLabel: { color: '#bdc3c7', fontSize: 12, textAlign: 'center' },
  summaryValue: { color: 'white', fontWeight: 'bold', fontSize: 16, marginTop: 5 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2c3e50', padding: 20, marginHorizontal: 15, marginVertical: 5, borderRadius: 10 },
  dateText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  earningsText: { color: '#bdc3c7', fontSize: 14, textAlign: 'right' },
  netProfitText: { fontWeight: 'bold', fontSize: 14, textAlign: 'right' },
  emptyText: { color: '#95a5a6', textAlign: 'center', marginTop: 50 },
  ozetKarti_detail: { backgroundColor: '#2c3e50', borderRadius: 10, padding: 20, margin: 15 },
  ozetSatiri_detail: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  ozetLabel_detail: { color: '#bdc3c7', fontSize: 16 },
  ozetDeger_detail: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  separator_detail: { height: 1, backgroundColor: '#485460', marginVertical: 15 },
  listelerContainer_detail: { flexDirection: 'row', paddingHorizontal: 15, marginTop: 10, gap: 10, paddingBottom: 40 },
  listeBaslik_detail: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  kayitItem_detail: { backgroundColor: '#34495e', padding: 10, borderRadius: 5, marginBottom: 5, minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editButton_detail: { padding: 5 },
  kayitTutar_detail: { fontWeight: 'bold', fontSize: 16 },
  notText_detail: { fontSize: 13, color: '#bdc3c7', marginTop: 3 },
  dateText_detail: { color: 'white', fontWeight: 'bold', fontSize: 18, textAlign: 'center' },
  emptyListText_detail: { color: '#95a5a6', textAlign: 'center', fontSize: 14, padding: 10, },
  modalContainer_detail: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
  modalContent_detail: { width: '85%', backgroundColor: '#34495e', borderRadius: 10, padding: 20 },
  modalTitle_detail: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input_detail: { backgroundColor: '#2c3e50', color: 'white', borderRadius: 5, padding: 12, fontSize: 16 },
  modalButtonContainer_detail: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  button_detail: { flex: 1, padding: 15, borderRadius: 5, alignItems: 'center' },
  cancelButton_detail: { backgroundColor: '#95a5a6', marginRight: 5 },
  saveButton_detail: { backgroundColor: '#27ae60', marginLeft: 5 },
  buttonText_detail: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});