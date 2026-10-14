/**
 * Danh mục 63 Tỉnh / Thành phố Việt Nam & Bộ Tiện ích Bóc tách Tỉnh từ Địa chỉ
 * Phục vụ chuẩn hóa dữ liệu tiếp nhận kho và bảng kê vận chuyển Logistics TMS
 */

export interface ProvinceInfo {
  name: string; // Tên chuẩn (VD: 'TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Khánh Hòa')
  code: string;
  aliases: string[]; // Các biến thể xuất hiện trong địa chỉ
}

export const VIETNAM_PROVINCES: ProvinceInfo[] = [
  // 5 Thành phố trực thuộc Trung ương
  { name: 'TP. Hồ Chí Minh', code: 'HCM', aliases: ['hồ chí minh', 'ho chi minh', 'hcm', 'tp hcm', 'tp.hcm', 'tp. hcm', 'sài gòn', 'sai gon', 'tphcm'] },
  { name: 'Hà Nội', code: 'HN', aliases: ['hà nội', 'ha noi', 'hn', 'tp hà nội', 'tp. hà nội'] },
  { name: 'Đà Nẵng', code: 'DAD', aliases: ['đà nẵng', 'da nang', 'tp đà nẵng', 'tp. đà nẵng'] },
  { name: 'Hải Phòng', code: 'HPH', aliases: ['hải phòng', 'hai phong', 'tp hải phòng', 'tp. hải phòng'] },
  { name: 'Cần Thơ', code: 'CTH', aliases: ['cần thơ', 'can tho', 'tp cần thơ', 'tp. cần thơ'] },

  // Miền Bắc
  { name: 'Bắc Ninh', code: 'BNI', aliases: ['bắc ninh', 'bac ninh'] },
  { name: 'Hưng Yên', code: 'HYE', aliases: ['hưng yên', 'hung yen'] },
  { name: 'Hải Dương', code: 'HDU', aliases: ['hải dương', 'hai duong'] },
  { name: 'Hà Nam', code: 'HNA', aliases: ['hà nam', 'ha nam'] },
  { name: 'Nam Định', code: 'NDI', aliases: ['nam định', 'nam dinh'] },
  { name: 'Ninh Bình', code: 'NBI', aliases: ['ninh bình', 'ninh binh'] },
  { name: 'Thái Bình', code: 'TBI', aliases: ['thái bình', 'thai binh'] },
  { name: 'Vĩnh Phúc', code: 'VPH', aliases: ['vĩnh phúc', 'vinh phuc'] },
  { name: 'Quảng Ninh', code: 'QNI', aliases: ['quảng ninh', 'quang ninh'] },
  { name: 'Bắc Giang', code: 'BGI', aliases: ['bắc giang', 'bac giang'] },
  { name: 'Phú Thọ', code: 'PTH', aliases: ['phú thọ', 'phu tho'] },
  { name: 'Thái Nguyên', code: 'TNG', aliases: ['thái nguyên', 'thai nguyen'] },
  { name: 'Lạng Sơn', code: 'LSO', aliases: ['lạng sơn', 'lang son'] },
  { name: 'Tuyên Quang', code: 'TQU', aliases: ['tuyên quang', 'tuyen quang'] },
  { name: 'Yên Bái', code: 'YBA', aliases: ['yên bái', 'yen bai'] },
  { name: 'Lào Cai', code: 'LCA', aliases: ['lào cai', 'lao cai'] },
  { name: 'Cao Bằng', code: 'CBA', aliases: ['cao bằng', 'cao bang'] },
  { name: 'Bắc Kạn', code: 'BKA', aliases: ['bắc kạn', 'bắc cạn', 'bac kan', 'bac can'] },
  { name: 'Hà Giang', code: 'HGI', aliases: ['hà giang', 'ha giang'] },
  { name: 'Hòa Bình', code: 'HBI', aliases: ['hòa bình', 'hoa binh'] },
  { name: 'Sơn La', code: 'SLA', aliases: ['sơn la', 'son la'] },
  { name: 'Điện Biên', code: 'DBI', aliases: ['điện biên', 'dien bien'] },
  { name: 'Lai Châu', code: 'LCH', aliases: ['lai châu', 'lai chau'] },

  // Miền Trung & Tây Nguyên
  { name: 'Thanh Hóa', code: 'THO', aliases: ['thanh hóa', 'thanh hoa'] },
  { name: 'Nghệ An', code: 'NAN', aliases: ['nghệ an', 'nghe an'] },
  { name: 'Hà Tĩnh', code: 'HTI', aliases: ['hà tĩnh', 'ha tinh'] },
  { name: 'Quảng Bình', code: 'QBI', aliases: ['quảng bình', 'quang binh'] },
  { name: 'Quảng Trị', code: 'QTR', aliases: ['quảng trị', 'quang tri'] },
  { name: 'Thừa Thiên Huế', code: 'TTH', aliases: ['thừa thiên huế', 'thừa thiên - huế', 'thua thien hue', 'huế', 'hue'] },
  { name: 'Quảng Nam', code: 'QNA', aliases: ['quảng nam', 'quang nam'] },
  { name: 'Quảng Ngãi', code: 'QNG', aliases: ['quảng ngãi', 'quang ngai'] },
  { name: 'Bình Định', code: 'BDI', aliases: ['bình định', 'binh dinh', 'quy nhơn', 'quy nhon'] },
  { name: 'Phú Yên', code: 'PYE', aliases: ['phú yên', 'phu yen', 'tuy hòa', 'tuy hoa'] },
  { name: 'Khánh Hòa', code: 'KHO', aliases: ['khánh hòa', 'khanh hoa', 'nha trang', 'cam ranh'] },
  { name: 'Ninh Thuận', code: 'NTH', aliases: ['ninh thuận', 'ninh thuan', 'phan rang'] },
  { name: 'Bình Thuận', code: 'BTH', aliases: ['bình thuận', 'binh thuan', 'phan thiết', 'phan thiet'] },
  { name: 'Kon Tum', code: 'KTU', aliases: ['kon tum', 'kontum'] },
  { name: 'Gia Lai', code: 'GLA', aliases: ['gia lai', 'gialai', 'pleiku', 'plei ku'] },
  { name: 'Đắk Lắk', code: 'DLA', aliases: ['đắk lắk', 'đăk lăk', 'đắc lắc', 'dak lak', 'daklak', 'buôn ma thuột', 'buon ma thuot'] },
  { name: 'Đắk Nông', code: 'DNO', aliases: ['đắk nông', 'đăk nông', 'dak nong', 'daknong', 'gia nghĩa'] },
  { name: 'Lâm Đồng', code: 'LDG', aliases: ['lâm đồng', 'lam dong', 'đà lạt', 'da lat', 'bảo lộc', 'bao loc'] },

  // Miền Nam & Tây Nam Bộ
  { name: 'Bình Dương', code: 'BDU', aliases: ['bình dương', 'binh duong', 'thủ dầu một', 'thu dau mot', 'dĩ an', 'di an', 'thuận an', 'thuan an', 'tân uyên', 'bến cát'] },
  { name: 'Đồng Nai', code: 'DNA', aliases: ['đồng nai', 'dong nai', 'biên hòa', 'bien hoa', 'long thành', 'nhơn trạch'] },
  { name: 'Bà Rịa - Vũng Tàu', code: 'BRV', aliases: ['bà rịa - vũng tàu', 'bà rịa vũng tàu', 'ba ria vung tau', 'vũng tàu', 'vung tau', 'bà rịa', 'ba ria'] },
  { name: 'Tây Ninh', code: 'TNI', aliases: ['tây ninh', 'tay ninh'] },
  { name: 'Bình Phước', code: 'BPC', aliases: ['bình phước', 'binh phuoc', 'đồng xoài', 'dong xoai'] },
  { name: 'Long An', code: 'LAN', aliases: ['long an', 'tân an', 'tan an', 'đức hòa', 'duc hoa', 'bến lức', 'ben luc', 'cần giuộc'] },
  { name: 'Tiền Giang', code: 'TGI', aliases: ['tiền giang', 'tien giang', 'mỹ tho', 'my tho'] },
  { name: 'Bến Tre', code: 'BTR', aliases: ['bến tre', 'ben tre'] },
  { name: 'Trà Vinh', code: 'TVI', aliases: ['trà vinh', 'tra vinh'] },
  { name: 'Vĩnh Long', code: 'VLO', aliases: ['vĩnh long', 'vinh long'] },
  { name: 'Đồng Tháp', code: 'DTH', aliases: ['đồng tháp', 'dong thap', 'cao lãnh', 'sa đéc'] },
  { name: 'An Giang', code: 'AGI', aliases: ['an giang', 'long xuyên', 'long xuyen', 'châu đốc', 'chau doc'] },
  { name: 'Kiên Giang', code: 'KGI', aliases: ['kiên giang', 'kien giang', 'rạch giá', 'rach gia', 'phú quốc', 'phu quoc'] },
  { name: 'Hậu Giang', code: 'HAG', aliases: ['hậu giang', 'hau giang', 'vị thanh'] },
  { name: 'Sóc Trăng', code: 'STR', aliases: ['sóc trăng', 'soc trang'] },
  { name: 'Bạc Liêu', code: 'BLI', aliases: ['bạc liêu', 'bac lieu'] },
  { name: 'Cà Mau', code: 'CMA', aliases: ['cà mau', 'ca mau'] },
];

/**
 * Hàm làm sạch chuỗi văn bản phục vụ so khớp
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[,\.\-\/\\_\(\)\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Trích xuất Tỉnh / Thành phố từ chuỗi Địa chỉ chi tiết
 * Thuật toán quét ưu tiên từ cuối chuỗi lên đầu (nơi thường ghi Tỉnh/TP trong địa chỉ Việt Nam)
 */
export function extractVietnamProvince(address: string | null | undefined): string {
  if (!address || typeof address !== 'string') return '';
  const cleanAddr = address.trim();
  if (!cleanAddr) return '';

  const normalizedAddr = normalizeText(cleanAddr);

  // 1. Quét theo các từ khóa có tiền tố chỉ dẫn rõ ràng (vd: "Tỉnh...", "TP....", "Thành phố...")
  const prefixRegex = /(?:tỉnh|thành phố|thành pho|tp\.|tp)\s+([a-zà-ỹ\s]+?)(?:$|\s*,\s*|\s*\.\s*|\s*;\s*|\s*-\s*|\s*\(|\s*\))/gi;
  let prefixMatch: RegExpExecArray | null;
  const candidates: string[] = [];

  while ((prefixMatch = prefixRegex.exec(cleanAddr)) !== null) {
    if (prefixMatch[1]) {
      candidates.push(prefixMatch[1].trim());
    }
  }

  // Đối chiếu các ứng viên trích xuất được từ tiền tố
  for (let i = candidates.length - 1; i >= 0; i--) {
    const candidateNorm = normalizeText(candidates[i]);
    for (const prov of VIETNAM_PROVINCES) {
      if (
        normalizeText(prov.name) === candidateNorm ||
        prov.aliases.some((alias) => candidateNorm.includes(alias) || alias === candidateNorm)
      ) {
        return prov.name;
      }
    }
  }

  // 2. Nếu không tìm thấy qua tiền tố, quét danh sách từ điển ưu tiên độ dài alias từ dài đến ngắn
  // và vị trí xuất hiện càng gần cuối chuỗi càng được ưu tiên
  let bestMatch: { provinceName: string; lastIndex: number; matchLength: number } | null = null;

  for (const prov of VIETNAM_PROVINCES) {
    // Sắp xếp alias dài trước để tránh 'huế' khớp đè 'thừa thiên huế'
    const sortedAliases = [...prov.aliases, normalizeText(prov.name)].sort(
      (a, b) => b.length - a.length
    );

    for (const alias of sortedAliases) {
      const idx = normalizedAddr.lastIndexOf(alias);
      if (idx !== -1) {
        // Kiểm tra biên từ (boundary check) để tránh khớp cục bộ
        const isStartBoundary = idx === 0 || /\s/.test(normalizedAddr[idx - 1]);
        const endPos = idx + alias.length;
        const isEndBoundary = endPos === normalizedAddr.length || /\s/.test(normalizedAddr[endPos]);

        if (isStartBoundary && isEndBoundary) {
          if (
            !bestMatch ||
            idx > bestMatch.lastIndex ||
            (idx === bestMatch.lastIndex && alias.length > bestMatch.matchLength)
          ) {
            bestMatch = {
              provinceName: prov.name,
              lastIndex: idx,
              matchLength: alias.length,
            };
          }
        }
      }
    }
  }

  return bestMatch ? bestMatch.provinceName : '';
}
