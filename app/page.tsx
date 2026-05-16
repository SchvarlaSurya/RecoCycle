"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Leaf, MapPin, Mail, Menu, Phone, Recycle, Truck, Users, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import LandingPickupModal from "@/app/components/LandingPickupModal";
import OpenPickupButton from "@/app/components/OpenPickupButton";
import RecoCycleBrand from "@/app/components/RecoCycleBrand";

const navLinks = [
  { label: "Beranda", href: "#" },
  { label: "Dampak", href: "#dampak" },
  { label: "Cara Kerja", href: "#cara-kerja" },
  { label: "Untuk Komunitas", href: "#komunitas" },
  { label: "Tentang Kami", href: "#tentang" },
];

const statsData = [
  { value: "175.000+", label: "Ton Sampah Dikelola" },
  { value: "12%", label: "Daur Ulang" },
  { value: "88%", label: "Terbuang" },
  { value: "10.000+", label: "Keluarga" },
];

const wasteData = [
  { name: "Baterai", value: 35, color: "#16a34a" },
  { name: "Logam", value: 28, color: "#22c55e" },
  { name: "Kardus", value: 22, color: "#4ade80" },
  { name: "Plastik", value: 10, color: "#86efac" },
  { name: "Elektronik", value: 5, color: "#bbf7d0" },
];

const features = [
  {
    icon: Truck,
    title: "Pickup Rumah Tangga",
    description: "Jadwalkan penjemputan sampah dari rumah Anda. Kurir kami datang tepat waktu untuk menimbang dan mencatat setoran Anda.",
  },
  {
    icon: Recycle,
    title: "Reward Transparan",
    description: "Setiap setoran tercatat jelas. Saldo langsung masuk ke akun Anda dan bisa dicairkan kapan saja.",
  },
  {
    icon: Users,
    title: "Dampak Terukur",
    description: "Lihat kontribusi Anda terhadap lingkungan melalui data dan laporan dampak yang transparan.",
  },
];

const steps = [
  {
    number: "01",
    title: "Jadwalkan Pickup",
    description: "Pilih jadwal penjemputan yang cocok untuk Anda melalui aplikasi atau website RecoCycle.",
  },
  {
    number: "02",
    title: "Kurir Datang & Timbang",
    description: "Tim kami datang ke lokasi, menimbang sampah Anda, dan mencatatnya langsung ke sistem.",
  },
  {
    number: "03",
    title: "Saldo Masuk",
    description: "Poin dari setoran Anda langsung masuk ke akun. Tukar dengan uang atau donasikan.",
  },
];

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              <RecoCycleBrand size="sm" />
            </div>
            <span className="text-xs font-medium text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Home
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onMouseEnter={() => setHoveredLink(link.label)}
                onMouseLeave={() => setHoveredLink(null)}
                className="relative text-sm font-medium text-stone-700 transition-colors duration-200 hover:text-emerald-600 py-1"
              >
                <span className="relative z-10">{link.label}</span>
                <motion.span
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 origin-left"
                  initial={{ scaleX: hoveredLink === link.label ? 1 : 0 }}
                  animate={{ scaleX: hoveredLink === link.label ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                />
                {hoveredLink === link.label && (
                  <motion.div
                    className="absolute -bottom-1 left-1/2 w-1 h-1 rounded-full bg-emerald-500"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.15 }}
                  />
                )}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="relative px-4 py-2 text-sm font-medium text-stone-700 hover:text-emerald-600 transition-colors duration-200 overflow-hidden group"
            >
              <span className="relative z-10">Masuk</span>
              <span className="absolute bottom-0 left-0 w-full h-px bg-emerald-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
            </Link>
            <Link
              href="/register"
              className="group relative px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-full overflow-hidden transition-all duration-300 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/30 active:scale-95"
            >
              <span className="relative z-10">Daftar</span>
              <motion.span
                className="absolute inset-0 bg-emerald-500"
                initial={{ x: "-100%" }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
                style={{ borderRadius: "9999px" }}
              />
            </Link>
          </div>

          <button
            className="md:hidden p-2 text-stone-700 relative group"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <motion.div
              animate={{ rotate: mobileMenuOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </motion.div>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden bg-white border-t border-stone-100 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={link.href}
                    className="block py-2 text-sm font-medium text-stone-700 hover:text-emerald-600 transition-colors relative group"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-500 group-hover:w-full transition-all duration-300" />
                  </Link>
                </motion.div>
              ))}
              <motion.div
                className="pt-3 flex flex-col gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                <Link
                  href="/login"
                  className="w-full text-center px-4 py-2 text-sm font-medium text-stone-700 border border-stone-200 rounded-full hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="w-full text-center px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-700 transition-colors"
                >
                  Daftar
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function Hero() {
  return (
    <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-emerald-50 to-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 leading-tight">
              Indonesia Darurat Sampah.
              <span className="text-emerald-600"> Bersama,</span> Kita Ubah Jadi Berkah.
            </h1>
            <p className="mt-6 text-lg text-stone-700 leading-relaxed">
              RecoCycle menghubungkan rumah tangga dengan sistem pengelolaan sampah yang terstruktur. Setor sampah, dapat reward, bantu lingkungan.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <OpenPickupButton className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-full transition-colors">
                Mulai Sekarang
                <ChevronRight className="w-4 h-4" />
              </OpenPickupButton>
              <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 border-2 border-stone-300 hover:border-emerald-600 text-stone-700 font-semibold rounded-full transition-colors">
                Lihat Demo
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center"
                  >
                    <Users className="w-5 h-5 text-emerald-600" />
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900">10.000+ rumah tangga</p>
                <p className="text-xs text-stone-600">telah bergabung</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative bg-gradient-to-br from-emerald-100 to-teal-100 rounded-3xl p-8 aspect-square flex items-center justify-center">
              <div className="absolute inset-4 bg-white/60 rounded-2xl backdrop-blur" />
              <div className="relative z-10 text-center">
                <Leaf className="w-32 h-32 text-emerald-600 mx-auto" />
                <p className="mt-4 text-xl font-bold text-stone-900">Recycle Together</p>
                <p className="text-sm text-stone-600">untuk Indonesia yang lebih bersih</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  return (
    <section className="py-12 bg-emerald-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {statsData.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <Truck className="w-8 h-8 text-emerald-200 mx-auto mb-2" />
              <p className="text-3xl sm:text-4xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-emerald-200 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ResponsiveBarChart() {
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 400, height: 256 });

  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      if (containerRef.current) {
        setDims({
          width: containerRef.current.offsetWidth,
          height: mobile ? 192 : 256,
        });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      <ResponsiveContainer width="100%" height={dims.height}>
        <BarChart data={wasteData} layout="vertical" margin={{ top: 5, right: isMobile ? 10 : 20, left: isMobile ? 5 : 10, bottom: 5 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#57534e", fontSize: isMobile ? 10 : 12 }}
            width={isMobile ? 45 : 80}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "none",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              fontSize: 12,
            }}
            cursor={{ fill: "rgba(16, 185, 129, 0.1)" }}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} animationDuration={1200}>
            {wasteData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ImpactSection() {
  return (
    <section id="dampak" className="py-16 px-4 sm:px-6 lg:px-8 bg-stone-50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-900">Dampak Nyata untuk Lingkungan</h2>
          <p className="mt-4 text-lg text-stone-700 max-w-2xl mx-auto">
            Setiap kontribusi Anda tercatat dan memberikan dampak nyata bagi lingkungan dan komunitas sekitar.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-3xl p-8 shadow-lg"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Recycle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">Data Komunitas</h3>
                <p className="text-sm text-stone-600">Total sampah terkelola</p>
              </div>
            </div>
            <div className="text-center py-8">
              <p className="text-5xl font-bold text-emerald-600">0,06 ton</p>
              <p className="text-stone-600 mt-2">sampah telah disetor</p>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center p-4 bg-stone-50 rounded-xl">
                <p className="text-2xl font-bold text-stone-900">2</p>
                <p className="text-xs text-stone-600">Penjemputan</p>
              </div>
              <div className="text-center p-4 bg-stone-50 rounded-xl">
                <p className="text-2xl font-bold text-stone-900">85%</p>
                <p className="text-xs text-stone-600">Tingkat Daur Ulang</p>
              </div>
              <div className="text-center p-4 bg-stone-50 rounded-xl">
                <p className="text-2xl font-bold text-stone-900">3</p>
                <p className="text-xs text-stone-600">Komunitas</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg"
          >
            <h3 className="text-lg font-bold text-stone-900 mb-4 sm:mb-6">Sampah Paling Sering Disetor</h3>
            <ResponsiveBarChart />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-900">Mengapa RecoCycle?</h2>
          <p className="mt-4 text-lg text-stone-700 max-w-2xl mx-auto">
            Platform pengelolaan sampah yang dirancang untuk kemudahan dan dampak maksimal.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-stone-50 rounded-3xl p-8 hover:shadow-xl transition-shadow"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-6">
                <feature.icon className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-3">{feature.title}</h3>
              <p className="text-stone-700 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="cara-kerja" className="py-16 px-4 sm:px-6 lg:px-8 bg-emerald-50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-900">Cara Kerja RecoCycle</h2>
          <p className="mt-4 text-lg text-stone-700 max-w-2xl mx-auto">
            Tiga langkah mudah untuk berkontribusi pada lingkungan yang lebih bersih.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative"
            >
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-emerald-200 -translate-x-1/2" />
              )}
              <div className="bg-white rounded-3xl p-8 text-center relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl font-bold">
                  {step.number}
                </div>
                <div className="pt-6">
                  <h3 className="text-xl font-bold text-stone-900 mb-3">{step.title}</h3>
                  <p className="text-stone-700 leading-relaxed">{step.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTABanner() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-emerald-600">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Siap Jadi Bagian Perubahan?</h2>
          <p className="mt-4 text-lg text-emerald-100 max-w-2xl mx-auto">
            Bergabunglah dengan ribuan rumah tangga yang telah berkontribusi pada pengelolaan sampah yang lebih baik.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <OpenPickupButton className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-emerald-50 text-emerald-700 font-semibold rounded-full transition-colors">
              <Leaf className="w-5 h-5" />
              Jadwalkan Pickup
            </OpenPickupButton>
            <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white hover:bg-white/10 text-white font-semibold rounded-full transition-colors">
              Daftar Sekarang
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-400 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <RecoCycleBrand size="sm" />
            </div>
            <p className="text-sm leading-relaxed">
              Platform pengelolaan sampah untuk Indonesia yang lebih bersih dan berkelanjutan.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Navigasi</h4>
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm hover:text-emerald-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Layanan</h4>
            <ul className="space-y-2">
              <li><span className="text-sm">Penjemputan Sampah</span></li>
              <li><span className="text-sm">Daur Ulang</span></li>
              <li><span className="text-sm">Rewards</span></li>
              <li><span className="text-sm">Komunitas</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Kontak</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">Jakarta, Indonesia</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span className="text-sm">hello@reocycle.id</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span className="text-sm">+62 21 1234 5678</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-stone-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm">© 2024 RecoCycle. Hak cipta dilindungi.</p>
          <div className="flex items-center gap-4">
            <span className="text-sm">Ikuti kami:</span>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center hover:bg-emerald-600 transition-colors cursor-pointer">
                <span className="text-xs">FB</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center hover:bg-emerald-600 transition-colors cursor-pointer">
                <span className="text-xs">IG</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center hover:bg-emerald-600 transition-colors cursor-pointer">
                <span className="text-xs">TW</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <StatsBar />
      <ImpactSection />
      <Features />
      <HowItWorks />
      <CTABanner />
      <Footer />
      <LandingPickupModal />
    </main>
  );
}