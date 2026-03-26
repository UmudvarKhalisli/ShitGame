"use client";

import { type ChangeEvent, useMemo, useRef, useState } from "react";

const fakeTerms = `Bu müqaviləni qəbul etməklə təsdiq edirsiniz ki, sayta daxil olduğunuz andan etibarən ən azı bir dəfə aynaya baxıb “mən niyə buradayam?” deyəcəksiniz. Şirkətimiz istənilən vaxt sizi telefonla narahat edib “Necəsən?” soruşma hüququnu özündə saxlayır, cavabınız “yaxşıyam” olarsa, növbəti sual avtomatik “əminsən?” olacaq. Həftənin cümə axşamı günləri platformaya daxil olan istifadəçilər sistem tərəfindən təsadüfi olaraq “kartof mütəxəssisi” elan edilə bilər. Əgər siz bu statusu inkar etsəniz, profil şəklinizin yanında görünməz medal yaranacaq və yalnız qonşunuz onu görə biləcək. Razılaşırsınız ki, yazdığınız hər bir şikayət server otağında qoyulmuş xəyali bir kaktus tərəfindən emosional olaraq qiymətləndiriləcək.

İstifadəçi qəbul edir ki, platforma bəzən səbəbsiz yerə motivasiya mesajı göndərə bilər: “Ayağa qalx, su iç, amma əvvəlcə yenə də refresh et.” Əgər ardıcıl üç dəfə səhv düyməyə bassanız, sistem bunu “yaradıcı yanaşma” kimi qiymətləndirib sizə virtual diplom verə bilər, diplomun mətnini isə yalnız mikrodalğalı soba işə düşəndə oxumaq mümkün olacaq. Hər bazar ertəsi saytın daxili alqoritmi istifadəçi adlarını qafiyəli versiyalara çevirib öz-özünə mahnı oxuya bilər. Siz razılaşırsınız ki, bu mahnılar bəzən tonallıqdan kənar olacaq və qulaqcıq taxmağınız tövsiyə ediləcək. Şirkət lazım bildikdə “fasilə ver, çay iç” bildirişi ilə bütün ciddi planlarınızı 90 saniyəlik komik videoya dəyişə bilər.

Qaydalarımıza əsasən, gecə saatlarında daxil olan istifadəçilərdən sistem “maraq naminə” ən sevdiyi yeməyin adını soruşa bilər. Cavab verməsəniz, tətbiq bunu dərin fəlsəfi etiraz kimi qəbul edib sizi “səssiz gurme” kateqoriyasına keçirəcək. Hər bir klikinizin yanında görünməyən mini hakim heyəti “bu klik özünü inamlı aparırdı” və ya “klikdə tərəddüd var idi” kimi qeydlər edə bilər. Razılaşırsınız ki, klaviaturada təsadüfən basdığınız düymələr belə bizim statistikada “mikro-epik qərarlar” adı ilə saxlanacaq. Şirkət bəzən test məqsədilə “salam” yerinə “şalom, salam, alo” yazan salamlaşma pəncərəsi göstərə bilər. Əgər siz gülümsəsəniz, bu, avtomatik olaraq müsbət rəy kimi qeydə alınacaq.

İstifadəçi təsdiq edir ki, bəzi günlərdə platforma tamamilə ciddi görünəcək, lakin küncdə gizlənmiş piksel ölçülü bir mətn “həyat qəribədir” yaza bilər. Mübahisəli hallarda qərarı təsadüfi seçilmiş iki stiker, bir boş fincan və moral dəstək verən imaginər hamster komitəsi verəcək. Siz razılaşırsınız ki, sistemin “dərhal” sözü bəzən “çox da dərhal olmayan yaxın gələcək” mənasına gələ bilər. Hər hansı düyməyə “Qəbul et” yazılması həmin düymənin həqiqətən sizi qəbul etməsi anlamına gəlmir; düymə öz emosional vəziyyətinə görə bir anlıq düşünüb sonra qərar verə bilər. Razılaşmanın bu bəndini oxuyarkən başınızı yelləmisinizsə, bu hərəkət hüquqi olaraq “mən bu oyunun nə qədər qəribə olduğunu anlayıram” bəyanatı kimi şərh ediləcək.

Son olaraq, bu şərtləri qəbul etməklə etiraf edirsiniz ki, platforma bəzən sizi heç bir səbəb olmadan təbrik edə, ardınca da “zarafat etdim” deyə bilər. Sistem tərəfindən göndərilən “çox yaxşı gedirsən” mesajı növbəti saniyədə “amma bir az da səbir” düzəlişi ilə müşayiət oluna bilər. İstifadəçi hesab edir ki, bu sənəddəki absurdluq səviyyəsi normaldan yüksəkdir və buna baxmayaraq davam etmək qərarı onun özünə məxsus cəsarətli seçimidir. Əgər burada yazılanların hamısını sonadək oxumusunuzsa, siz artıq qeyri-rəsmi olaraq “Səbr Qəhrəmanı” statusuna yüksəlmisiniz. Bu status maddi üstünlük vermir, amma özünüzlə fəxr etmək üçün kifayət qədər əyləncəlidir. Davam etməklə siz həm şərtləri, həm də bu cümlənin lazımsız uzunluğunu qəbul etmiş olursunuz.`;

export default function Stage3_Terms({
  onFail,
  onComplete,
}: {
  onComplete: () => void;
  onFail: () => void;
}) {
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [flashColor, setFlashColor] = useState<"red" | "green" | null>(null);
  const [typedPhrase, setTypedPhrase] = useState("");
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const termsRef = useRef<HTMLDivElement | null>(null);
  const requiredPhrase = useMemo(() => {
    const options = [
      "MƏN OXUDUM",
      "DÜŞÜNÜB QƏBUL EDİRƏM",
      "SƏBİRLƏ DAVAM",
      "QAYDALARI ANLADIM",
      "GERİ DÖNÜŞ YOXDUR",
      "BU ŞƏRTLƏR AĞIRDIR",
      "İMZA ATMADAN KEÇMİR",
      "MƏNTİQİM HƏLƏ YERİNDƏDİR",
      "OXU VƏ QƏRAR VER",
    ];
    return options[Math.floor(Math.random() * options.length)] ?? "SƏBİRLƏ DAVAM";
  }, []);
  const reversedRequiredPhrase = useMemo(
    () => Array.from(requiredPhrase).reverse().join(""),
    [requiredPhrase],
  );

  const normalize = (value: string) => value.trim().toLocaleUpperCase("az");

  const handleScroll = () => {
    const el = termsRef.current;
    if (!el) {
      return;
    }

    const reached = el.scrollTop + el.clientHeight >= el.scrollHeight - 12;
    setIsScrolledToBottom(reached);
  };

  const handleAccept = async () => {
    if (isLoading) {
      return;
    }

    if (!isChecked) {
      setErrorText("Davam etmək üçün checkbox işarələnməlidir.");
      onFail();
      return;
    }

    if (!isScrolledToBottom) {
      setErrorText("Əvvəlcə mətni sonadək scroll et.");
      setFlashColor("red");
      onFail();
      window.setTimeout(() => setFlashColor(null), 220);
      return;
    }

    if (normalize(typedPhrase) !== normalize(reversedRequiredPhrase)) {
      setErrorText("Cümləni tərsinə düzgün yazmadın.");
      setFlashColor("red");
      onFail();
      window.setTimeout(() => setFlashColor(null), 220);
      return;
    }

    setErrorText("");
    setStatusText("Qəbul edildi ✅");
    setIsLoading(true);
    setProgress(100);
    setFlashColor("green");
    window.setTimeout(() => {
      setFlashColor(null);
      setIsLoading(false);
      onComplete();
    }, 250);
  };

  return (
    <section className="fixed inset-0 z-[112] flex items-center justify-center bg-[#050508] p-6">
      <div className="relative w-full max-w-3xl space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950/85 p-6 shadow-xl">
      {flashColor && (
        <div
          className={`pointer-events-none fixed inset-0 z-40 ${
            flashColor === "red" ? "bg-red-500/45" : "bg-emerald-500/35"
          }`}
        />
      )}

      <h1 className="text-3xl font-bold text-zinc-100">Qaydalar və Şərtlər</h1>

      <div
        ref={termsRef}
        onScroll={handleScroll}
        className="h-[45vh] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900/80 p-4 text-sm leading-7 text-zinc-200"
      >
        {fakeTerms}
      </div>

      <label className="flex items-center gap-3 text-sm text-zinc-200">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setIsChecked(event.target.checked)}
          className="h-4 w-4 rounded border-zinc-500 bg-zinc-800"
        />
        Oxudum, anladım, peşman olacam
      </label>

      <div className="space-y-2">
        <p className="text-xs text-zinc-400">
          Bu cümləni tərsinə yaz: <span className="font-bold text-zinc-200">{requiredPhrase}</span>
        </p>
        <input
          value={typedPhrase}
          onChange={(event) => setTypedPhrase(event.target.value)}
          placeholder="Cümləni tərsinə yaz"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-zinc-400"
        />
      </div>

      <button
        type="button"
        onClick={handleAccept}
        disabled={isLoading}
        className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Qəbul Et
      </button>

      <div className="space-y-2">
        <div className="h-4 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full bg-emerald-500 transition-[width] duration-100"
            style={{ width: `${progress || (isScrolledToBottom ? 100 : 0)}%` }}
          />
        </div>
        <p className="text-xs text-zinc-400">Yüklənir: {progress || (isScrolledToBottom ? 100 : 0)}%</p>
      </div>

      {errorText && <p className="text-sm text-rose-400">{errorText}</p>}
      {statusText && <p className="text-sm font-semibold text-amber-300">{statusText}</p>}
      </div>
    </section>
  );
}
