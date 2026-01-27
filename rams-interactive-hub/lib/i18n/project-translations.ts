/**
 * Project Translations - All 28 RAMS Projects
 * Languages: Russian (ru), Kazakh (kk), Turkish (tr), English (en)
 */

import { Language } from "./translations";

export interface LocalizedText {
  ru: string;
  kk: string;
  tr: string;
  en: string;
}

export interface ProjectTranslation {
  title: LocalizedText;
  subtitle: LocalizedText;
  description: LocalizedText;
  status: LocalizedText;
  features: LocalizedText[];
}

// Status translations
export const statusTranslations: Record<string, LocalizedText> = {
  "Строится": { ru: "Строится", kk: "Салынуда", tr: "İnşaat Halinde", en: "Under Construction" },
  "Сдан": { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
  "Сдана 1 очередь": { ru: "Сдана 1 очередь", kk: "1-кезең тапсырылды", tr: "1. Etap Tamamlandı", en: "Phase 1 Completed" },
  "Завершен": { ru: "Завершен", kk: "Аяқталды", tr: "Tamamlandı", en: "Completed" },
};

// Scene type translations
export const sceneTypeTranslations: Record<string, LocalizedText> = {
  "Видео": { ru: "Видео", kk: "Бейне", tr: "Video", en: "Video" },
  "Фото": { ru: "Фото", kk: "Фото", tr: "Fotoğraf", en: "Photo" },
};

// Scene title translations
export const sceneTitleTranslations: Record<string, LocalizedText> = {
  "Презентация": { ru: "Презентация", kk: "Презентация", tr: "Sunum", en: "Presentation" },
  "Главный вид": { ru: "Главный вид", kk: "Негізгі көрініс", tr: "Ana Görünüm", en: "Main View" },
};

// Property class translations
export const classTranslations: Record<string, LocalizedText> = {
  "Premium+": { ru: "Premium+", kk: "Premium+", tr: "Premium+", en: "Premium+" },
  "Premium": { ru: "Premium", kk: "Premium", tr: "Premium", en: "Premium" },
  "Business+": { ru: "Business+", kk: "Business+", tr: "Business+", en: "Business+" },
  "Business": { ru: "Business", kk: "Business", tr: "Business", en: "Business" },
  "Business A+": { ru: "Бизнес А+", kk: "Бизнес А+", tr: "Business A+", en: "Business A+" },
  "Comfort+": { ru: "Комфорт+", kk: "Комфорт+", tr: "Konfor+", en: "Comfort+" },
  "Comfort": { ru: "Комфорт", kk: "Комфорт", tr: "Konfor", en: "Comfort" },
  "Elite": { ru: "Элит", kk: "Элит", tr: "Elit", en: "Elite" },
  "Resort": { ru: "Курорт", kk: "Курорт", tr: "Tatil", en: "Resort" },
  "Культурный": { ru: "Культурный", kk: "Мәдени", tr: "Kültürel", en: "Cultural" },
  "Промышленный": { ru: "Промышленный", kk: "Өнеркәсіптік", tr: "Endüstriyel", en: "Industrial" },
  "Образовательный": { ru: "Образовательный", kk: "Білім беру", tr: "Eğitim", en: "Educational" },
};

export const projectTranslations: Record<string, ProjectTranslation> = {
  // 1. RAMS BEYOND
  "01-rams-beyond-st-regis": {
    title: { ru: "ST. REGIS ALMATY", kk: "ST. REGIS ALMATY", tr: "ST. REGIS ALMATI", en: "ST. REGIS ALMATY" },
    subtitle: { ru: "Архитектурный ансамбль", kk: "Сәулет ансамблі", tr: "Mimari Topluluk", en: "Architectural Ensemble" },
    description: {
      ru: "RAMS Beyond Almaty — амбициозный проект, способный стать отражением амбиций города, новой точкой притяжения и визитной карточкой для жителей, гостей и инвесторов.",
      kk: "RAMS Beyond Almaty — қаланың амбициясын көрсете алатын, тұрғындар, қонақтар мен инвесторлар үшін жаңа тартымдылық нүктесі бола алатын амбициялық жоба.",
      tr: "RAMS Beyond Almaty — şehrin tutkularını yansıtabilecek, sakinler ve yatırımcılar için yeni bir cazibe merkezi olabilecek iddialı bir proje.",
      en: "RAMS Beyond Almaty — an ambitious project that can reflect the city's ambitions, becoming a new attraction for residents, guests, and investors.",
    },
    status: { ru: "Строится", kk: "Салынуда", tr: "İnşaat Halinde", en: "Under Construction" },
    features: [
      { ru: "Архитектурный ансамбль из 8 зданий", kk: "8 ғимараттан тұратын сәулет ансамблі", tr: "8 binadan oluşan mimari topluluk", en: "Architectural ensemble of 8 buildings" },
      { ru: "Beyond Street Mall — торговые площади для мировых брендов", kk: "Beyond Street Mall — әлемдік брендтер үшін сауда алаңдары", tr: "Beyond Street Mall — dünya markaları için ticaret alanları", en: "Beyond Street Mall — retail spaces for world brands" },
      { ru: "Beyond Gourmet Gallery — рестораны высокой кухни", kk: "Beyond Gourmet Gallery — жоғары асхана мейрамханалары", tr: "Beyond Gourmet Gallery — üst düzey restoranlar", en: "Beyond Gourmet Gallery — fine dining restaurants" },
      { ru: "Beyond Office Spaces — офисы класса А+", kk: "Beyond Office Spaces — А+ класты кеңселер", tr: "Beyond Office Spaces — A+ sınıfı ofisler", en: "Beyond Office Spaces — Class A+ offices" },
      { ru: "Beyond Residences — премиальные резиденции", kk: "Beyond Residences — премиум резиденциялар", tr: "Beyond Residences — premium konutlar", en: "Beyond Residences — premium residences" },
      { ru: "Первый в Алматы отель St. Regis", kk: "Алматыдағы алғашқы St. Regis қонақ үйі", tr: "Almatı'daki ilk St. Regis oteli", en: "First St. Regis hotel in Almaty" },
      { ru: "Смотровая площадка с видом на Заилийский Алатау", kk: "Іле Алатауына қарайтын шолу алаңы", tr: "Zaili Alatau manzaralı seyir terası", en: "Observation deck with views of Zailiysky Alatau" },
      { ru: "Конгресс-центр с банкетными залами", kk: "Банкет залдары бар конгресс-орталық", tr: "Ziyafet salonları olan kongre merkezi", en: "Congress center with banquet halls" },
    ],
  },

  // 2. RAMS CITY
  "02-rams-city-kazakhstan": {
    title: { ru: "KAZAKHSTAN", kk: "ҚАЗАҚСТАН", tr: "KAZAKİSTAN", en: "KAZAKHSTAN" },
    subtitle: { ru: "Европейский стиль", kk: "Еуропалық стиль", tr: "Avrupa tarzı", en: "European style" },
    description: {
      ru: "Rams City – современный жилой комплекс в европейском стиле. Особое преимущество — шикарный панорамный вид из окон.",
      kk: "Rams City – еуропалық стильдегі заманауи тұрғын үй кешені. Ерекше артықшылығы — терезелерден керемет панорамалық көрініс.",
      tr: "Rams City – Avrupa tarzında modern bir konut kompleksi. Özel avantajı — pencerelerden muhteşem panoramik manzara.",
      en: "Rams City – a modern residential complex in European style. Special advantage — stunning panoramic views from windows.",
    },
    status: { ru: "Сдана 1 очередь", kk: "1-кезең тапсырылды", tr: "1. Etap Tamamlandı", en: "Phase 1 Completed" },
    features: [
      { ru: "Отличная локация у реки Большая Алматинка", kk: "Үлкен Алматы өзенінің жанындағы тамаша орналасу", tr: "Büyük Almatinka nehri yakınında mükemmel konum", en: "Excellent location near Bolshaya Almatinka river" },
      { ru: "Школа во дворе", kk: "Ауладағы мектеп", tr: "Avluda okul", en: "School in the courtyard" },
      { ru: "Близость к ТРЦ ADK и Mega", kk: "ADK және Mega СОО-на жақындық", tr: "ADK ve Mega AVM'ye yakınlık", en: "Proximity to ADK and Mega malls" },
      { ru: "Зеленый RAMS бульвар более километра", kk: "Бір километрден астам RAMS жасыл бульвары", tr: "Bir kilometreden uzun yeşil RAMS bulvarı", en: "Green RAMS boulevard over one kilometer" },
      { ru: "Современные детские и workout-площадки", kk: "Заманауи балалар және воркаут алаңдары", tr: "Modern çocuk ve spor alanları", en: "Modern playgrounds and workout areas" },
    ],
  },

  // 3. NOMAD
  "03-nomad": {
    title: { ru: "ЖИЛОЙ КОМПЛЕКС", kk: "ТҰРҒЫН ҮЙ КЕШЕНІ", tr: "KONUT KOMPLEKSİ", en: "RESIDENTIAL COMPLEX" },
    subtitle: { ru: "Современный стиль", kk: "Заманауи стиль", tr: "Modern tarz", en: "Modern style" },
    description: {
      ru: "Современный жилой комплекс Nomad в тихом Алмалинском районе с зонами отдыха и игровыми площадками.",
      kk: "Nomad заманауи тұрғын үй кешені тыныш Алмалы ауданында демалыс аймақтары мен ойын алаңдарымен.",
      tr: "Nomad modern konut kompleksi sessiz Almalinsky bölgesinde dinlenme alanları ve oyun alanları ile.",
      en: "Nomad modern residential complex in quiet Almalinsky district with recreation areas and playgrounds.",
    },
    status: { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
    features: [
      { ru: "Развитая инфраструктура", kk: "Дамыған инфрақұрылым", tr: "Gelişmiş altyapı", en: "Developed infrastructure" },
      { ru: "Центр города", kk: "Қала орталығы", tr: "Şehir merkezi", en: "City center" },
      { ru: "Детский сад на 200 мест", kk: "200 орындық балабақша", tr: "200 kişilik anaokulu", en: "Kindergarten for 200 children" },
      { ru: "Подземный паркинг на 352 места", kk: "352 орынға арналған жер асты паркингі", tr: "352 araçlık yeraltı otoparkı", en: "Underground parking for 352 cars" },
      { ru: "Сейсмостойкость", kk: "Сейсмикалық төзімділік", tr: "Depreme dayanıklılık", en: "Seismic resistance" },
    ],
  },

  // 4. NOMAD 2
  "04-nomad-2": {
    title: { ru: "ЖИЛОЙ КОМПЛЕКС", kk: "ТҰРҒЫН ҮЙ КЕШЕНІ", tr: "KONUT KOMPLEKSİ", en: "RESIDENTIAL COMPLEX" },
    subtitle: { ru: "Продолжение успеха", kk: "Табыстың жалғасы", tr: "Başarının devamı", en: "Continuation of success" },
    description: {
      ru: "Современный жилой комплекс Nomad 2 — продолжение успешного проекта Nomad.",
      kk: "Nomad 2 заманауи тұрғын үй кешені — табысты Nomad жобасының жалғасы.",
      tr: "Nomad 2 modern konut kompleksi — başarılı Nomad projesinin devamı.",
      en: "Nomad 2 modern residential complex — continuation of the successful Nomad project.",
    },
    status: { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
    features: [
      { ru: "Развитая инфраструктура", kk: "Дамыған инфрақұрылым", tr: "Gelişmiş altyapı", en: "Developed infrastructure" },
      { ru: "Центр города", kk: "Қала орталығы", tr: "Şehir merkezi", en: "City center" },
      { ru: "Современный дизайн", kk: "Заманауи дизайн", tr: "Modern tasarım", en: "Modern design" },
      { ru: "Квартиры от 42 до 104 м²", kk: "42-ден 104 м²-ге дейінгі пәтерлер", tr: "42 ile 104 m² arası daireler", en: "Apartments from 42 to 104 m²" },
    ],
  },

  // 5. ДОМ НА АБАЯ
  "05-dom-na-abaya": {
    title: { ru: "ЦЕНТР ГОРОДА", kk: "ҚАЛА ОРТАЛЫҒЫ", tr: "ŞEHİR MERKEZİ", en: "CITY CENTER" },
    subtitle: { ru: "Престижная локация", kk: "Беделді орналасу", tr: "Prestijli konum", en: "Prestigious location" },
    description: {
      ru: "ЖК «Дом на Абая» — уют и спокойствие в центре мегаполиса рядом с метро «Алатау».",
      kk: "«Абай үйі» ТҮК — «Алатау» метросының жанында мегаполис орталығындағы жайлылық.",
      tr: "«Abay'daki Ev» — «Alatau» metrosu yakınında metropol merkezinde konfor.",
      en: "«House on Abay» — comfort in the center of the metropolis near «Alatau» metro.",
    },
    status: { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
    features: [
      { ru: "Метро «Алатау» (3 минуты пешком)", kk: "«Алатау» метросы (жаяу 3 минут)", tr: "«Alatau» metrosu (yürüyerek 3 dakika)", en: "«Alatau» metro (3 min walk)" },
      { ru: "Фитнес-клуб на территории", kk: "Аумақта фитнес-клуб", tr: "Alanda fitness kulübü", en: "Fitness club on site" },
      { ru: "Консьерж-сервис", kk: "Консьерж қызметі", tr: "Concierge hizmeti", en: "Concierge service" },
      { ru: "Бизнес-центр в комплексе", kk: "Кешендегі бизнес-орталық", tr: "Kompleksteki iş merkezi", en: "Business center in complex" },
    ],
  },

  // 6. LATIFA RESIDENCE
  "06-latifa-residence": {
    title: { ru: "RESIDENCE", kk: "RESIDENCE", tr: "RESIDENCE", en: "RESIDENCE" },
    subtitle: { ru: "Восточная элегантность", kk: "Шығыс талғамы", tr: "Doğu zarafeti", en: "Eastern elegance" },
    description: {
      ru: "ЖК Latifa Residence в центре города у подножия гор в Медеуском районе.",
      kk: "Latifa Residence ТҮК қала орталығында Медеу ауданында тау етегінде.",
      tr: "Latifa Residence konut kompleksi şehir merkezinde Medeu bölgesinde dağların eteğinde.",
      en: "Latifa Residence in the city center at the foot of the mountains in Medeu district.",
    },
    status: { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
    features: [
      { ru: "Подножье гор", kk: "Тау етегі", tr: "Dağların eteği", en: "Foothills" },
      { ru: "Вид на Кок-Тобе", kk: "Көктөбеге көрініс", tr: "Kök-Töbe manzarası", en: "View of Kok-Tobe" },
      { ru: "Двухуровневый паркинг", kk: "Екі деңгейлі паркинг", tr: "İki katlı otopark", en: "Two-level parking" },
      { ru: "Собственный детский сад", kk: "Өз балабақшасы", tr: "Kendi anaokulu", en: "Own kindergarten" },
    ],
  },

  // 7. IZUMRUD RESIDENCE
  "07-izumrud-residence": {
    title: { ru: "RESIDENCE", kk: "RESIDENCE", tr: "RESIDENCE", en: "RESIDENCE" },
    subtitle: { ru: "Изумрудная роскошь", kk: "Зүмірет сәні", tr: "Zümrüt lüksü", en: "Emerald luxury" },
    description: {
      ru: "Izumrud Residence — комфортабельный дом в развитом Бостандыкском районе.",
      kk: "Izumrud Residence — дамыған Бостандық ауданындағы жайлы үй.",
      tr: "Izumrud Residence — gelişmiş Bostandık bölgesinde konforlu ev.",
      en: "Izumrud Residence — comfortable home in developed Bostandyk district.",
    },
    status: { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
    features: [
      { ru: "Парк «Аллея выпускников» рядом", kk: "«Түлектер аллеясы» саябағы жақын", tr: "«Mezunlar Caddesi» parkı yakınında", en: "«Graduates Alley» park nearby" },
      { ru: "Подземный паркинг", kk: "Жер асты паркингі", tr: "Yeraltı otoparkı", en: "Underground parking" },
      { ru: "Бесшумные лифты KONE", kk: "KONE дыбыссыз лифттері", tr: "KONE sessiz asansörler", en: "Silent KONE elevators" },
      { ru: "Закрытый двор без машин", kk: "Көліксіз жабық аула", tr: "Arabasız kapalı avlu", en: "Closed car-free courtyard" },
    ],
  },

  // 8. ВОСТОЧНЫЙ ПАРК
  "08-vostochny-park": {
    title: { ru: "ЖИЛОЙ КОМПЛЕКС", kk: "ТҰРҒЫН ҮЙ КЕШЕНІ", tr: "KONUT KOMPLEKSİ", en: "RESIDENTIAL COMPLEX" },
    subtitle: { ru: "Комфорт у парка", kk: "Саябақ жанындағы жайлылық", tr: "Parkın yanında konfor", en: "Comfort by the park" },
    description: {
      ru: "ЖК «Восточный Парк» в ста метрах от Центрального парка — лучшая экология в городе.",
      kk: "«Шығыс паркі» ТҮК Орталық саябақтан жүз метрде — қаладағы ең жақсы экология.",
      tr: "«Doğu Parkı» Merkez Parktan yüz metre uzaklıkta — şehirdeki en iyi ekoloji.",
      en: "«Eastern Park» one hundred meters from Central Park — best ecology in the city.",
    },
    status: { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
    features: [
      { ru: "Парки для прогулок", kk: "Серуендеуге арналған саябақтар", tr: "Yürüyüş parkları", en: "Parks for walks" },
      { ru: "Вид на горы", kk: "Тауларға көрініс", tr: "Dağ manzarası", en: "Mountain view" },
      { ru: "Панорамное остекление", kk: "Панорамалық әйнектеу", tr: "Panoramik cam", en: "Panoramic glazing" },
      { ru: "Сейсмостойкость 9 баллов", kk: "9 балдық сейсмикалық төзімділік", tr: "9 derece depreme dayanıklılık", en: "9-point seismic resistance" },
    ],
  },

  // 9. RAMS GARDEN ALMATY
  "09-rams-garden-almaty": {
    title: { ru: "ALMATY", kk: "ALMATY", tr: "ALMATI", en: "ALMATY" },
    subtitle: { ru: "Премиальный жилой комплекс", kk: "Премиум тұрғын үй кешені", tr: "Premium konut kompleksi", en: "Premium residential complex" },
    description: {
      ru: "RAMS Garden — современный ЖК бизнес-класса на 2,75 га с 13 блоками и 643 квартирами.",
      kk: "RAMS Garden — 2,75 га аумақта 13 блок пен 643 пәтері бар заманауи бизнес-класс ТҮК.",
      tr: "RAMS Garden — 2,75 hektarda 13 blok ve 643 daireli modern iş sınıfı konut kompleksi.",
      en: "RAMS Garden — modern business-class complex on 2.75 ha with 13 blocks and 643 apartments.",
    },
    status: { ru: "Сдана 1 очередь", kk: "1-кезең тапсырылды", tr: "1. Etap Tamamlandı", en: "Phase 1 Completed" },
    features: [
      { ru: "Квартиры в чистовой отделке", kk: "Таза әрлеуі бар пәтерлер", tr: "Temiz bitişli daireler", en: "Apartments with finishing" },
      { ru: "Эко-паркинг", kk: "Эко-паркинг", tr: "Eko-otopark", en: "Eco-parking" },
      { ru: "Зимний сад", kk: "Қысқы бақ", tr: "Kış bahçesi", en: "Winter garden" },
      { ru: "Глэмпинг на крыше", kk: "Шатырдағы глэмпинг", tr: "Çatıda glamping", en: "Rooftop glamping" },
      { ru: "All-in-One: коворкинг, фитнес, кинотеатр", kk: "All-in-One: коворкинг, фитнес, кинотеатр", tr: "All-in-One: ortak çalışma, spor, sinema", en: "All-in-One: coworking, gym, cinema" },
      { ru: "Вид на Кок-Тобе", kk: "Көктөбеге көрініс", tr: "Kök-Töbe manzarası", en: "View of Kok-Tobe" },
    ],
  },

  // 10. GRANDE VIE
  "10-grande-vie": {
    title: { ru: "КЛУБНЫЙ ДОМ", kk: "КЛУБТЫҚ ҮЙ", tr: "KULÜP EVİ", en: "CLUB HOUSE" },
    subtitle: { ru: "Большая жизнь", kk: "Үлкен өмір", tr: "Büyük hayat", en: "Grand life" },
    description: {
      ru: "Grande Vie — клубная резиденция в горной местности микрорайона Ерменсай.",
      kk: "Grande Vie — Ерменсай шағын ауданының таулы жерлеріндегі клубтық резиденция.",
      tr: "Grande Vie — Yermensay mikro bölgesinin dağlık bölgesinde kulüp rezidansı.",
      en: "Grande Vie — club residence in the mountainous area of Yermensai microdistrict.",
    },
    status: { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
    features: [
      { ru: "Локация в окружении гор", kk: "Таулармен қоршалған орналасу", tr: "Dağlarla çevrili konum", en: "Location surrounded by mountains" },
      { ru: "Чистый горный воздух", kk: "Таза тау ауасы", tr: "Temiz dağ havası", en: "Clean mountain air" },
      { ru: "Панорамные окна с террасами", kk: "Террасалары бар панорамалық терезелер", tr: "Teraslı panoramik pencereler", en: "Panoramic windows with terraces" },
      { ru: "Клубный формат с консьерж-сервисом", kk: "Консьерж қызметі бар клубтық формат", tr: "Concierge hizmetli kulüp formatı", en: "Club format with concierge service" },
    ],
  },

  // 11. RAMS SIGNATURE
  "11-rams-signature": {
    title: { ru: "LIFESTYLE QUARTER", kk: "LIFESTYLE QUARTER", tr: "LIFESTYLE QUARTER", en: "LIFESTYLE QUARTER" },
    subtitle: { ru: "Премиум класс", kk: "Премиум класс", tr: "Premium sınıf", en: "Premium class" },
    description: {
      ru: "Rams Signature — ЖК бизнес-класса в сердце делового центра Алматы возле ТРЦ Forum.",
      kk: "Rams Signature — Forum СОО жанында Алматының іскерлік орталығының жүрегіндегі бизнес-класс ТҮК.",
      tr: "Rams Signature — Forum AVM yakınında Almatı'nın iş merkezinin kalbinde iş sınıfı konut kompleksi.",
      en: "Rams Signature — business-class complex in the heart of Almaty's business center near Forum mall.",
    },
    status: { ru: "Строится", kk: "Салынуда", tr: "İnşaat Halinde", en: "Under Construction" },
    features: [
      { ru: "Чистовая отделка", kk: "Таза әрлеу", tr: "Temiz bitiş", en: "Finishing included" },
      { ru: "Видеонаблюдение 24/7", kk: "24/7 бейнебақылау", tr: "7/24 video gözetim", en: "24/7 surveillance" },
      { ru: "Бесключевой доступ Face ID", kk: "Face ID кілтсіз кіру", tr: "Face ID anahtarsız erişim", en: "Keyless Face ID access" },
      { ru: "All-in-One: коворкинг, фитнес, SPA, кинотеатр", kk: "All-in-One: коворкинг, фитнес, SPA, кинотеатр", tr: "All-in-One: ortak çalışma, spor, SPA, sinema", en: "All-in-One: coworking, gym, SPA, cinema" },
      { ru: "Зарядные станции для электрокаров", kk: "Электрокөліктерге арналған зарядтау станциялары", tr: "Elektrikli araçlar için şarj istasyonları", en: "EV charging stations" },
    ],
  },

  // 12. RAMS SAIAHAT
  "12-rams-saiahat": {
    title: { ru: "ИСТОРИЧЕСКИЙ ЦЕНТР", kk: "ТАРИХИ ОРТАЛЫҚ", tr: "TARİHİ MERKEZ", en: "HISTORIC CENTER" },
    subtitle: { ru: "Традиции и современность", kk: "Дәстүр мен заманауилық", tr: "Gelenek ve modernlik", en: "Tradition and modernity" },
    description: {
      ru: "RAMS Saiahat — ЖК в историческом центре Алматы с открытым парком и школой.",
      kk: "RAMS Saiahat — ашық саябағы мен мектебі бар Алматының тарихи орталығындағы ТҮК.",
      tr: "RAMS Saiahat — açık park ve okulu olan Almatı'nın tarihi merkezindeki konut kompleksi.",
      en: "RAMS Saiahat — complex in Almaty's historic center with open park and school.",
    },
    status: { ru: "Строится", kk: "Салынуда", tr: "İnşaat Halinde", en: "Under Construction" },
    features: [
      { ru: "Открытый парк 1,3 га", kk: "1,3 га ашық саябақ", tr: "1,3 ha açık park", en: "1.3 ha open park" },
      { ru: "Школа и детсад во дворе", kk: "Ауладағы мектеп пен балабақша", tr: "Avluda okul ve anaokulu", en: "School and kindergarten in courtyard" },
      { ru: "Башня с часами", kk: "Сағаты бар мұнара", tr: "Saat kulesi", en: "Clock tower" },
      { ru: "Рядом: Центральная мечеть, Зеленый базар", kk: "Жақын жерде: Орталық мешіт, Көк базар", tr: "Yakında: Merkez Cami, Yeşil Pazar", en: "Nearby: Central Mosque, Green Bazaar" },
    ],
  },

  // 13. RAMS GARDEN ATYRAU
  "13-rams-garden-atyrau": {
    title: { ru: "ATYRAU", kk: "ATYRAU", tr: "ATIRAU", en: "ATYRAU" },
    subtitle: { ru: "Премиум на западе", kk: "Батыстағы премиум", tr: "Batıda premium", en: "Premium in the west" },
    description: {
      ru: "RAMS Garden Atyrau — ЖК бизнес-класса в центре Атырау со стильным дизайном.",
      kk: "RAMS Garden Atyrau — стильді дизайны бар Атырау орталығындағы бизнес-класс ТҮК.",
      tr: "RAMS Garden Atyrau — şık tasarımlı Atırau merkezinde iş sınıfı konut kompleksi.",
      en: "RAMS Garden Atyrau — business-class complex in Atyrau center with stylish design.",
    },
    status: { ru: "Строится", kk: "Салынуда", tr: "İnşaat Halinde", en: "Under Construction" },
    features: [
      { ru: "Безопасный закрытый двор", kk: "Қауіпсіз жабық аула", tr: "Güvenli kapalı avlu", en: "Safe closed courtyard" },
      { ru: "Эко-паркинг", kk: "Эко-паркинг", tr: "Eko-otopark", en: "Eco-parking" },
      { ru: "Kids room, Fitness room, Cinema+PS", kk: "Kids room, Fitness room, Cinema+PS", tr: "Kids room, Fitness room, Cinema+PS", en: "Kids room, Fitness room, Cinema+PS" },
      { ru: "Река Жайык в шаговой доступности", kk: "Жайық өзені жаяу қолжетімділікте", tr: "Cayık nehri yürüme mesafesinde", en: "Zhaiyk river within walking distance" },
    ],
  },

  // 14. ORTAU MARRIOTT BC
  "14-ortau-marriott-bc": {
    title: { ru: "RAMS CENTER", kk: "RAMS CENTER", tr: "RAMS CENTER", en: "RAMS CENTER" },
    subtitle: { ru: "Бизнес-центр с отелем", kk: "Қонақ үйі бар бизнес-орталық", tr: "Otelli iş merkezi", en: "Business center with hotel" },
    description: {
      ru: "БЦ RAMS Centre — бизнес-центр класса «А» с первым в Алматы отелем Marriott 5*.",
      kk: "RAMS Centre БО — Алматыдағы алғашқы Marriott 5* қонақ үйі бар «А» класты бизнес-орталық.",
      tr: "RAMS Centre — Almatı'daki ilk Marriott 5* oteli ile «A» sınıfı iş merkezi.",
      en: "RAMS Centre — Class «A» business center with the first Marriott 5* hotel in Almaty.",
    },
    status: { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
    features: [
      { ru: "Бизнес-центр класса А", kk: "А класты бизнес-орталық", tr: "A sınıfı iş merkezi", en: "Class A business center" },
      { ru: "Первый в Алматы отель Marriott 5*", kk: "Алматыдағы алғашқы Marriott 5* қонақ үйі", tr: "Almatı'daki ilk Marriott 5* oteli", en: "First Marriott 5* hotel in Almaty" },
      { ru: "Панорамные окна, потолки 4,4 м", kk: "Панорамалық терезелер, 4,4 м төбелер", tr: "Panoramik pencereler, 4,4 m tavan", en: "Panoramic windows, 4.4m ceilings" },
      { ru: "Конференц-залы", kk: "Конференц-залдар", tr: "Konferans salonları", en: "Conference halls" },
    ],
  },

  // 15. RAMS EVO
  "15-rams-evo": {
    title: { ru: "ЭВОЛЮЦИЯ ЖИЗНИ", kk: "ӨМІР ЭВОЛЮЦИЯСЫ", tr: "YAŞAM EVRİMİ", en: "EVOLUTION OF LIFE" },
    subtitle: { ru: "Новый формат комфорта", kk: "Жайлылықтың жаңа форматы", tr: "Yeni konfor formatı", en: "New comfort format" },
    description: {
      ru: "RAMS EVO — архитектурная эволюция Алмалинского района с EVO Concept благоустройства.",
      kk: "RAMS EVO — EVO Concept абаттандыру бар Алмалы ауданының сәулеттік эволюциясы.",
      tr: "RAMS EVO — EVO Concept peyzaj ile Almalinsky bölgesinin mimari evrimi.",
      en: "RAMS EVO — architectural evolution of Almalinsky district with EVO Concept landscaping.",
    },
    status: { ru: "Строится", kk: "Салынуда", tr: "İnşaat Halinde", en: "Under Construction" },
    features: [
      { ru: "EVO Concept благоустройства", kk: "EVO Concept абаттандыру", tr: "EVO Concept peyzaj", en: "EVO Concept landscaping" },
      { ru: "Собственная школа во дворе", kk: "Ауладағы өз мектебі", tr: "Avluda kendi okulu", en: "Own school in courtyard" },
      { ru: "All-in-One: коворкинг, фитнес, кинотеатр", kk: "All-in-One: коворкинг, фитнес, кинотеатр", tr: "All-in-One: ortak çalışma, spor, sinema", en: "All-in-One: coworking, gym, cinema" },
      { ru: "Рядом река Есентай и парк Ганди", kk: "Жақын жерде Есентай өзені мен Ганди саябағы", tr: "Yakında Yessentay nehri ve Gandhi parkı", en: "Nearby Esentai river and Gandhi park" },
    ],
  },

  // 16. RAMS KERUEN CITY
  "16-rams-keruen-city": {
    title: { ru: "АСТАНА", kk: "АСТАНА", tr: "ASTANA", en: "ASTANA" },
    subtitle: { ru: "Столичный проект", kk: "Астаналық жоба", tr: "Başkent projesi", en: "Capital project" },
    description: {
      ru: "Keruen City — ЖК в Астане, где прошлое и будущее создают идеальные условия для жизни.",
      kk: "Keruen City — өткен мен болашақ тіршілік үшін тамаша жағдай жасайтын Астанадағы ТҮК.",
      tr: "Keruen City — geçmiş ve geleceğin yaşam için ideal koşullar yarattığı Astana'daki konut kompleksi.",
      en: "Keruen City — complex in Astana where past and future create ideal living conditions.",
    },
    status: { ru: "Строится", kk: "Салынуда", tr: "İnşaat Halinde", en: "Under Construction" },
    features: [
      { ru: "Рядом ТРЦ Aport Mall", kk: "Жақын жерде Aport Mall СОО", tr: "Yakında Aport Mall AVM", en: "Near Aport Mall" },
      { ru: "Видеонаблюдение 24/7", kk: "24/7 бейнебақылау", tr: "7/24 video gözetim", en: "24/7 surveillance" },
      { ru: "Смарт-замки", kk: "Смарт-құлыптар", tr: "Akıllı kilitler", en: "Smart locks" },
      { ru: "Закрытые дворы без машин", kk: "Көліксіз жабық аулалар", tr: "Arabasız kapalı avlular", en: "Closed car-free courtyards" },
    ],
  },

  // 17. ORTAU
  "17-ortau": {
    title: { ru: "ЖИЛОЙ КОМПЛЕКС", kk: "ТҰРҒЫН ҮЙ КЕШЕНІ", tr: "KONUT KOMPLEKSİ", en: "RESIDENTIAL COMPLEX" },
    subtitle: { ru: "Инновационный ЖК", kk: "Инновациялық ТҮК", tr: "Yenilikçi konut kompleksi", en: "Innovative complex" },
    description: {
      ru: "Ortau — инновационный ЖК в Бостандыкском районе с благоприятной экологией.",
      kk: "Ortau — қолайлы экологиясы бар Бостандық ауданындағы инновациялық ТҮК.",
      tr: "Ortau — uygun ekolojiye sahip Bostandık bölgesinde yenilikçi konut kompleksi.",
      en: "Ortau — innovative complex in Bostandyk district with favorable ecology.",
    },
    status: { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
    features: [
      { ru: "18 многофункциональных комнат для аренды", kk: "Жалға алуға арналған 18 көп функциялы бөлме", tr: "Kiralık 18 çok işlevli oda", en: "18 multifunctional rooms for rent" },
      { ru: "Пять 10-этажных домов", kk: "Бес 10 қабатты үй", tr: "Beş 10 katlı bina", en: "Five 10-story buildings" },
      { ru: "Двухуровневый паркинг", kk: "Екі деңгейлі паркинг", tr: "İki katlı otopark", en: "Two-level parking" },
      { ru: "Озелененный двор с беседками", kk: "Шарбақтары бар жасылдандырылған аула", tr: "Çardaklı yeşillendirilmiş avlu", en: "Landscaped courtyard with gazebos" },
    ],
  },

  // 18. LAMIYA
  "18-lamiya": {
    title: { ru: "ЖИЛОЙ КОМПЛЕКС", kk: "ТҰРҒЫН ҮЙ КЕШЕНІ", tr: "KONUT KOMPLEKSİ", en: "RESIDENTIAL COMPLEX" },
    subtitle: { ru: "Уютный дом", kk: "Жайлы үй", tr: "Rahat ev", en: "Cozy home" },
    description: {
      ru: "Lamiya — новый взгляд на старый культурный центр Алматы с футуристичным фасадом.",
      kk: "Lamiya — футуристік қасбетімен Алматының ескі мәдени орталығына жаңа көзқарас.",
      tr: "Lamiya — fütüristik cephesiyle Almatı'nın eski kültür merkezine yeni bir bakış.",
      en: "Lamiya — a new perspective on Almaty's old cultural center with futuristic facade.",
    },
    status: { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
    features: [
      { ru: "Салоны красоты, кафе, бутики", kk: "Сұлулық салондары, кафелер, бутиктер", tr: "Güzellik salonları, kafeler, butikler", en: "Beauty salons, cafes, boutiques" },
      { ru: "Тихий старый центр", kk: "Тыныш ескі орталық", tr: "Sessiz eski merkez", en: "Quiet old center" },
      { ru: "Рядом парк «Fantasy»", kk: "Жақын жерде «Fantasy» саябағы", tr: "Yakında «Fantasy» parkı", en: "Near «Fantasy» park" },
    ],
  },

  // 19. LA VERDE
  "19-la-verde": {
    title: { ru: "ЗЕЛЕНЫЙ ОАЗИС", kk: "ЖАСЫЛ ОАЗИС", tr: "YEŞİL VAHA", en: "GREEN OASIS" },
    subtitle: { ru: "Eco-friendly", kk: "Eco-friendly", tr: "Eco-friendly", en: "Eco-friendly" },
    description: {
      ru: "La Verde — элитный ЖК у подножья гор рядом с рекой Есентай, сочетающий городскую и загородную жизнь.",
      kk: "La Verde — қалалық және қала сыртындағы өмірді біріктіретін Есентай өзені жанындағы тау етегіндегі элиталық ТҮК.",
      tr: "La Verde — şehir ve kır yaşamını birleştiren Yessentay nehri yakınında dağların eteğinde elit konut kompleksi.",
      en: "La Verde — elite complex at the foot of mountains near Esentai river, combining city and country life.",
    },
    status: { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
    features: [
      { ru: "10 трехэтажных домов класса «элит»", kk: "«Элит» класты 10 үш қабатты үй", tr: "«Elit» sınıfı 10 üç katlı ev", en: "10 three-story «elite» class houses" },
      { ru: "Персональный выход на реку Есентай", kk: "Есентай өзеніне жеке шығу", tr: "Yessentay nehrine özel çıkış", en: "Personal access to Esentai river" },
      { ru: "Собственный теннисный корт", kk: "Жеке теннис корты", tr: "Özel tenis kortu", en: "Own tennis court" },
      { ru: "Панорамные окна с видами на горы", kk: "Тауларға көрінісі бар панорамалық терезелер", tr: "Dağ manzaralı panoramik pencereler", en: "Panoramic windows with mountain views" },
    ],
  },

  // 20. ILE DE FRANCE
  "20-ile-de-france": {
    title: { ru: "ФРАНЦУЗСКИЙ СТИЛЬ", kk: "ФРАНЦУЗ СТИЛІ", tr: "FRANSIZ TARZI", en: "FRENCH STYLE" },
    subtitle: { ru: "Элегантность Парижа", kk: "Париж талғамы", tr: "Paris zarafeti", en: "Paris elegance" },
    description: {
      ru: "Ile de France — элитный ЖК с шармом Парижа и видом на Кок-тобе.",
      kk: "Ile de France — Париж сәні мен Көктөбеге көрінісі бар элиталық ТҮК.",
      tr: "Ile de France — Paris'in cazibesini taşıyan ve Kök-Töbe manzaralı elit konut kompleksi.",
      en: "Ile de France — elite complex with Parisian charm and view of Kok-Tobe.",
    },
    status: { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
    features: [
      { ru: "Французский архитектурный стиль", kk: "Француз сәулет стилі", tr: "Fransız mimari tarzı", en: "French architectural style" },
      { ru: "Сейсмостойкость 9 баллов", kk: "9 балдық сейсмикалық төзімділік", tr: "9 derece depreme dayanıklılık", en: "9-point seismic resistance" },
      { ru: "Рядом каток «Медео» и «Шымбулак»", kk: "Жақын жерде «Медеу» және «Шымбұлақ» мұз айдыны", tr: "Yakında «Medeo» ve «Şimbulak» buz pisti", en: "Near «Medeo» and «Shymbulak» skating rinks" },
      { ru: "Вид на Кок-Тобе", kk: "Көктөбеге көрініс", tr: "Kök-Töbe manzarası", en: "View of Kok-Tobe" },
    ],
  },

  // 21. FORUM RESIDENCE
  "21-forum-residence": {
    title: { ru: "RESIDENCE", kk: "RESIDENCE", tr: "RESIDENCE", en: "RESIDENCE" },
    subtitle: { ru: "Бизнес-класс", kk: "Бизнес-класс", tr: "İş sınıfı", en: "Business class" },
    description: {
      ru: "Forum Residence — ЖК с просторным жильем и хорошей инфраструктурой.",
      kk: "Forum Residence — кең тұрғын үйі мен жақсы инфрақұрылымы бар ТҮК.",
      tr: "Forum Residence — geniş konutları ve iyi altyapısı olan konut kompleksi.",
      en: "Forum Residence — complex with spacious housing and good infrastructure.",
    },
    status: { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
    features: [
      { ru: "Тихие дворы", kk: "Тыныш аулалар", tr: "Sessiz avlular", en: "Quiet courtyards" },
      { ru: "Вид на горы", kk: "Тауларға көрініс", tr: "Dağ manzarası", en: "Mountain view" },
      { ru: "Сейсмостойкость 9 баллов", kk: "9 балдық сейсмикалық төзімділік", tr: "9 derece depreme dayanıklılık", en: "9-point seismic resistance" },
      { ru: "Панорамные окна", kk: "Панорамалық терезелер", tr: "Panoramik pencereler", en: "Panoramic windows" },
    ],
  },

  // 22. ALMATY MUSEUM
  "22-almaty-museum": {
    title: { ru: "OF ARTS", kk: "OF ARTS", tr: "OF ARTS", en: "OF ARTS" },
    subtitle: { ru: "Культурный центр", kk: "Мәдени орталық", tr: "Kültür merkezi", en: "Cultural center" },
    description: {
      ru: "Almaty Museum of Arts — первый музей современного искусства в Казахстане.",
      kk: "Almaty Museum of Arts — Қазақстандағы заманауи өнердің алғашқы мұражайы.",
      tr: "Almaty Museum of Arts — Kazakistan'daki ilk modern sanat müzesi.",
      en: "Almaty Museum of Arts — first museum of modern art in Kazakhstan.",
    },
    status: { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
    features: [
      { ru: "Проект британского бюро Chapman Taylor", kk: "Chapman Taylor британдық бюросының жобасы", tr: "İngiliz Chapman Taylor bürosunun projesi", en: "Project by British firm Chapman Taylor" },
      { ru: "«Улица искусства» высотой 18 м", kk: "18 м биіктікті «Өнер көшесі»", tr: "18 m yüksekliğinde «Sanat Caddesi»", en: "18m high «Art Street»" },
      { ru: "Вдохновлено каньоном Чарын", kk: "Шарын каньонынан шабыт алған", tr: "Çarın kanyonundan ilham almış", en: "Inspired by Charyn Canyon" },
      { ru: "Выставочные площадки мирового уровня", kk: "Әлемдік деңгейдегі көрме алаңдары", tr: "Dünya çapında sergi alanları", en: "World-class exhibition spaces" },
    ],
  },

  // 23. HAVAL
  "23-haval": {
    title: { ru: "АВТОЦЕНТР", kk: "АВТООРТАЛЫҚ", tr: "OTO MERKEZİ", en: "AUTO CENTER" },
    subtitle: { ru: "Дилерский центр", kk: "Дилерлік орталық", tr: "Bayi merkezi", en: "Dealer center" },
    description: {
      ru: "Мультибрендовый завод по производству китайских автомобилей Chery, Haval и Changan.",
      kk: "Chery, Haval және Changan қытай автомобильдерін шығаратын мультибрендті зауыт.",
      tr: "Chery, Haval ve Changan Çin otomobillerinin üretim fabrikası.",
      en: "Multi-brand factory producing Chinese cars Chery, Haval and Changan.",
    },
    status: { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
    features: [
      { ru: "Площадь территории 309 тыс. кв.м", kk: "Аумақ ауданы 309 мың шаршы метр", tr: "309 bin m² alan", en: "309,000 sq.m territory" },
      { ru: "Производство Chery, Haval, Changan", kk: "Chery, Haval, Changan өндірісі", tr: "Chery, Haval, Changan üretimi", en: "Production of Chery, Haval, Changan" },
      { ru: "Шоурум", kk: "Шоурум", tr: "Showroom", en: "Showroom" },
      { ru: "Сервисный центр", kk: "Сервис орталығы", tr: "Servis merkezi", en: "Service center" },
    ],
  },

  // 24. LUKOIL
  "24-lukoil": {
    title: { ru: "ОФИСНЫЙ КОМПЛЕКС", kk: "КЕҢСЕ КЕШЕНІ", tr: "OFİS KOMPLEKSİ", en: "OFFICE COMPLEX" },
    subtitle: { ru: "Бизнес-центр", kk: "Бизнес-орталық", tr: "İş merkezi", en: "Business center" },
    description: {
      ru: "Современный завод по производству смазочных материалов ЛУКОЙЛ в Алматинской области.",
      kk: "Алматы облысындағы ЛУКОЙЛ май материалдарын өндіретін заманауи зауыт.",
      tr: "Almatı bölgesinde LUKOIL'in modern yağlayıcı malzeme üretim fabrikası.",
      en: "Modern LUKOIL lubricants production plant in Almaty region.",
    },
    status: { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
    features: [
      { ru: "Мощность до 100 000 тонн в год", kk: "Жылына 100 000 тоннаға дейін қуат", tr: "Yılda 100.000 ton kapasiteli", en: "Capacity up to 100,000 tons per year" },
      { ru: "Площадь 12,5 га", kk: "Ауданы 12,5 га", tr: "12,5 ha alan", en: "12.5 ha area" },
      { ru: "Роботизированный склад", kk: "Роботтандырылған қойма", tr: "Robotik depo", en: "Robotic warehouse" },
      { ru: "Современная лаборатория", kk: "Заманауи зертхана", tr: "Modern laboratuvar", en: "Modern laboratory" },
    ],
  },

  // 25. RAMS CITY SCHOOL
  "25-rams-city-school": {
    title: { ru: "ШКОЛА", kk: "МЕКТЕП", tr: "OKUL", en: "SCHOOL" },
    subtitle: { ru: "Образовательный центр", kk: "Білім беру орталығы", tr: "Eğitim merkezi", en: "Educational center" },
    description: {
      ru: "Baiterek School — крупнейшая частная научно-технологическая школа Центральной Азии.",
      kk: "Baiterek School — Орталық Азиядағы ең ірі жеке ғылыми-технологиялық мектеп.",
      tr: "Baiterek School — Orta Asya'nın en büyük özel bilim ve teknoloji okulu.",
      en: "Baiterek School — the largest private science and technology school in Central Asia.",
    },
    status: { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
    features: [
      { ru: "Площадь кампуса 28 000 м²", kk: "Кампус ауданы 28 000 м²", tr: "28.000 m² kampüs alanı", en: "28,000 m² campus area" },
      { ru: "Вместимость до 3 000 учеников", kk: "3 000 оқушыға дейін сыйымдылық", tr: "3.000 öğrenci kapasiteli", en: "Capacity up to 3,000 students" },
      { ru: "Факультетская система обучения", kk: "Факультеттік оқыту жүйесі", tr: "Fakülte eğitim sistemi", en: "Faculty-based education system" },
      { ru: "Международные стандарты", kk: "Халықаралық стандарттар", tr: "Uluslararası standartlar", en: "International standards" },
    ],
  },

  // 26. MARRIOTT ISSYK-KUL
  "26-marriott-issykkul": {
    title: { ru: "ISSYK-KUL RESORT", kk: "ISSYK-KUL RESORT", tr: "ISSIK-GÖL RESORT", en: "ISSYK-KUL RESORT" },
    subtitle: { ru: "Курортный комплекс", kk: "Курорттық кешен", tr: "Tatil kompleksi", en: "Resort complex" },
    description: {
      ru: "Rams Resort & Villas — элитный курорт на Иссык-Куле с 33 виллами и отелем Marriott 5*.",
      kk: "Rams Resort & Villas — 33 виллалы және Marriott 5* қонақ үйлі Ыстықкөлдегі элиталық курорт.",
      tr: "Rams Resort & Villas — 33 villa ve Marriott 5* oteli olan Issık-Köl'deki elit tatil köyü.",
      en: "Rams Resort & Villas — elite resort on Issyk-Kul with 33 villas and Marriott 5* hotel.",
    },
    status: { ru: "Строится", kk: "Салынуда", tr: "İnşaat Halinde", en: "Under Construction" },
    features: [
      { ru: "Всего 33 эксклюзивные виллы", kk: "Барлығы 33 эксклюзивті вилла", tr: "Toplam 33 özel villa", en: "Only 33 exclusive villas" },
      { ru: "Мировой бренд Marriott 5*", kk: "Marriott 5* әлемдік бренді", tr: "Dünya markası Marriott 5*", en: "World brand Marriott 5*" },
      { ru: "Private марина для яхт", kk: "Яхталарға арналған жеке марина", tr: "Yatlar için özel marina", en: "Private yacht marina" },
      { ru: "Срок окупаемости до 9 лет", kk: "Өтелу мерзімі 9 жылға дейін", tr: "9 yıla kadar geri ödeme", en: "Payback up to 9 years" },
      { ru: "Facility Services 24/7", kk: "24/7 Facility Services", tr: "7/24 Facility Services", en: "24/7 Facility Services" },
    ],
  },

  // 27. HYUNDAI
  "27-hyundai": {
    title: { ru: "TRANS KAZAKHSTAN", kk: "TRANS KAZAKHSTAN", tr: "TRANS KAZAKİSTAN", en: "TRANS KAZAKHSTAN" },
    subtitle: { ru: "Автомобильный завод", kk: "Автомобиль зауыты", tr: "Otomobil fabrikası", en: "Automobile factory" },
    description: {
      ru: "Hyundai Trans Kazakhstan — завод по производству легковых автомобилей на 15 гектарах.",
      kk: "Hyundai Trans Kazakhstan — 15 гектарда жеңіл автомобильдер шығаратын зауыт.",
      tr: "Hyundai Trans Kazakhstan — 15 hektarda binek otomobil üretim fabrikası.",
      en: "Hyundai Trans Kazakhstan — passenger car production plant on 15 hectares.",
    },
    status: { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
    features: [
      { ru: "Площадь 15 гектаров", kk: "Ауданы 15 гектар", tr: "15 hektar alan", en: "15 hectares area" },
      { ru: "Шесть корпусов", kk: "Алты корпус", tr: "Altı bina", en: "Six buildings" },
      { ru: "Сварочный и покрасочный цеха", kk: "Дәнекерлеу және бояу цехтары", tr: "Kaynak ve boya atölyeleri", en: "Welding and painting shops" },
      { ru: "Оборудование из Южной Кореи", kk: "Оңтүстік Кореядан жабдық", tr: "Güney Kore'den ekipman", en: "Equipment from South Korea" },
    ],
  },

  // 28. SAKURA
  "28-sakura": {
    title: { ru: "ЖИЛОЙ КОМПЛЕКС", kk: "ТҰРҒЫН ҮЙ КЕШЕНІ", tr: "KONUT KOMPLEKSİ", en: "RESIDENTIAL COMPLEX" },
    subtitle: { ru: "Японская эстетика", kk: "Жапон эстетикасы", tr: "Japon estetiği", en: "Japanese aesthetics" },
    description: {
      ru: "Sakura — ЖК с японской эстетикой на 7 гектарах в живописном месте.",
      kk: "Sakura — көрікті жердегі 7 гектарда жапон эстетикасы бар ТҮК.",
      tr: "Sakura — pitoresk bir yerde 7 hektarda Japon estetiğine sahip konut kompleksi.",
      en: "Sakura — complex with Japanese aesthetics on 7 hectares in a picturesque location.",
    },
    status: { ru: "Сдан", kk: "Тапсырылды", tr: "Tamamlandı", en: "Completed" },
    features: [
      { ru: "Территория 7 гектаров", kk: "7 гектар аумақ", tr: "7 hektar alan", en: "7 hectares territory" },
      { ru: "Два бассейна", kk: "Екі бассейн", tr: "İki havuz", en: "Two pools" },
      { ru: "Высота потолков 3,3 м", kk: "Төбе биіктігі 3,3 м", tr: "3,3 m tavan yüksekliği", en: "3.3m ceiling height" },
      { ru: "Сейсмоустойчивость до 10 баллов", kk: "10 балға дейін сейсмикалық төзімділік", tr: "10 dereceye kadar depreme dayanıklılık", en: "Seismic resistance up to 10 points" },
      { ru: "Панорамное остекление", kk: "Панорамалық әйнектеу", tr: "Panoramik cam", en: "Panoramic glazing" },
    ],
  },
};

// Helper function to get localized project data
export function getLocalizedProject(projectId: string, language: Language) {
  const translation = projectTranslations[projectId];
  if (!translation) return null;

  return {
    title: translation.title[language],
    subtitle: translation.subtitle[language],
    description: translation.description[language],
    status: translation.status[language],
    features: translation.features.map(f => f[language]),
  };
}

// Helper to get localized status
export function getLocalizedStatus(status: string, language: Language): string {
  return statusTranslations[status]?.[language] || status;
}

// Helper to get localized scene type
export function getLocalizedSceneType(type: string, language: Language): string {
  return sceneTypeTranslations[type]?.[language] || type;
}

// Helper to get localized scene title
export function getLocalizedSceneTitle(title: string, language: Language): string {
  // Check if it's a known title, otherwise return with "View X" pattern
  if (sceneTitleTranslations[title]) {
    return sceneTitleTranslations[title][language];
  }

  // Handle "Вид X" pattern
  if (title.startsWith("Вид ")) {
    const viewLabels: Record<Language, string> = {
      ru: "Вид",
      kk: "Көрініс",
      tr: "Görünüm",
      en: "View",
    };
    const num = title.replace("Вид ", "");
    return `${viewLabels[language]} ${num}`;
  }

  return title;
}

// Helper to get localized property class
export function getLocalizedClass(propertyClass: string, language: Language): string {
  return classTranslations[propertyClass]?.[language] || propertyClass;
}
