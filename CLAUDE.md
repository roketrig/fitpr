# FitPR — Proje Brifi (Claude Code için)

Bu dosya, Claude Code ile bu projeye başlarken ilk bağlamı vermek için hazırlandı.

## Uygulama fikri

Güç antrenmanı (bench press, squat, deadlift, overhead press vb.) yapan sporcular
için bir takip/gamification uygulaması. Temel sorun: sporcular "geçen hafta bu
makinede/harekette kaç kg kaldırmıştım" diye hatırlamakta zorlanıyor. Uygulama bunu
otomatik takip edip, kişisel rekor (PR) kırıldığında ve genel başarım eşiklerine
ulaşıldığında **kutlama animasyonu (konfeti), ses efekti ve rozet** ile ödüllendiriyor.

### Temel kullanıcı akışı
- Kullanıcı bir hareket seçer (MVP: bench press, squat, deadlift, overhead press).
- Ortada bir "bar" görseli var; `+` / `-` butonlarıyla bara ağırlık eklenip
  çıkarılıyor (görsel olarak disk/plaka ekleniyor/azalıyor), set kaydediliyor.
- Girilen ağırlık, kullanıcının o harekette o ana kadarki en yüksek değerini
  geçerse → **PR kutlaması** (konfeti + ses + "Yeni Rekor!" animasyonu).
- Belirli mutlak eşikler (ör. erkeklerde bench 100 kg) aşıldığında → **genel
  başarım/rozet** kazanılıyor. Eşikler cinsiyete göre ayrı tanımlı (kadın/erkek
  ayrı skala).
- Kullanıcı profili: boy, kilo, cinsiyet, hedefler gibi klasik fitness app
  bilgileri.
- Başarımlar ekranı: kazanılan/kazanılmamış rozetlerin listesi.

### Öncelik sırası
1. Önce uygulamanın kendisi bitirilecek (sağlam, çalışan MVP).
2. Play Store / App Store hesapları ve yayın süreci EN SONA bırakılacak — kullanıcı
   bu hesapları kendisi açacak (Apple Developer Program $99/yıl, Google Play
   Console $25 tek seferlik), Claude bu adımı onun adına yapamaz ama süreçte
   yönlendirir.

## Teknik kararlar

- **Frontend:** React Native + Expo (TypeScript). Tek kod tabanından hem Android
  hem iOS. `EAS Build` sayesinde iOS derlemesi için Mac gerekmiyor, `EAS Submit`
  ile mağaza gönderimi de otomatikleştirilebiliyor.
- **Backend:** Kullanıcı hesabı + bulut senkronizasyonu isteniyor. Önerilen:
  **Supabase** (Postgres + Auth + otomatik REST API, iyi bir ücretsiz katman,
  React Native ile kolay entegrasyon). Kullanıcının kendi Supabase hesabını açıp
  proje URL + anon key vermesi gerekecek (bu hesap da kullanıcıya ait olmalı).
- **Animasyon/ses:** Konfeti için `react-native-confetti-cannon` veya
  `lottie-react-native`, ses için `expo-av`.
- **State/gezinme:** React Navigation (tab bar: Antrenman / Başarımlar / Profil),
  hafif state yönetimi (Zustand veya React Context — proje büyüdükçe karar
  verilecek).

## Veri modeli taslağı (Supabase / Postgres)

```sql
-- profiles: auth.users ile 1-1 ilişkili
create table profiles (
  id uuid references auth.users primary key,
  display_name text,
  gender text check (gender in ('male', 'female')),
  height_cm numeric,
  weight_kg numeric,
  created_at timestamptz default now()
);

-- exercises: MVP'de sabit 4 kayıt (bench press, squat, deadlift, overhead press)
create table exercises (
  id serial primary key,
  slug text unique not null,
  display_name text not null
);

-- sets: her kaydedilen set
create table workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  exercise_id int references exercises(id),
  weight_kg numeric not null,
  reps int not null default 1,
  is_pr boolean default false,
  performed_at timestamptz default now()
);

-- achievements: kazanılan rozetler
create table achievements (
  id serial primary key,
  slug text unique not null,      -- ör. 'bench_100kg_male'
  exercise_id int references exercises(id),
  gender text check (gender in ('male', 'female')),
  threshold_kg numeric not null,
  title text not null
);

create table user_achievements (
  user_id uuid references profiles(id),
  achievement_id int references achievements(id),
  unlocked_at timestamptz default now(),
  primary key (user_id, achievement_id)
);
```

Bu şema bir başlangıç noktası — geliştirme ilerledikçe değişebilir/genişleyebilir.

## Sonraki adımlar (kaba görev listesi)

1. Expo + TypeScript proje iskeletini kur, navigasyonu (tab bar) hazırla.
2. Yukarıdaki Supabase şemasını kullanıcının kendi Supabase projesinde kur, auth +
   client entegrasyonunu yap.
3. Kayıt/giriş ekranları.
4. Antrenman kaydı ekranı: hareket seçimi + bar/ağırlık +/- arayüzü.
5. PR tespiti ve başarım (achievement) mantığı + kutlama animasyonu/sesi.
6. Başarımlar ve Profil ekranları.
7. Kullanıcının kendi telefonunda Expo Go ile canlı test.
8. (En son) Play Store / App Store hesapları, mağaza kuralları ve yayın süreci.

## Notlar

- Kullanıcı mobil geliştirmede deneyimli değil — adımları net ve açık şekilde,
  gerekirse tek tek komut vererek anlatmak gerekiyor.
- Kullanıcı düzenli gym yapan biri, bu app'i hem kendi ihtiyacından hem de
  potansiyel bir ürün olarak düşünüyor olabilir; ama şu an odak MVP'yi bitirmek.
