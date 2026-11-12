import { ContactForm, type ContactInitial } from "@/components/contact-form";
import { createContact } from "@/lib/actions/contacts";
import { tr } from "@/lib/i18n";
import { pageContext } from "@/lib/session";

const blank: ContactInitial = {
  role: "vendor",
  partyType: "juristic",
  titleTh: "บริษัท",
  titleEn: "",
  nameTh: "",
  nameEn: "",
  lastNameTh: "",
  lastNameEn: "",
  taxId: "",
  branchCode: "00000",
  addressTh: "",
  addressEn: "",
  phone: "",
  email: "",
  building: "",
  roomNo: "",
  floorNo: "",
  village: "",
  addressNo: "",
  moo: "",
  soi: "",
  street: "",
  subdistrict: "",
  district: "",
  province: "",
  postalCode: "",
};

export default async function NewContactPage() {
  const { locale } = await pageContext();
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{tr(locale, "ผู้ติดต่อใหม่", "New contact")}</h1>
        </div>
      </div>
      <section className="card">
        <ContactForm locale={locale} action={createContact} initial={blank} submitLabel={tr(locale, "บันทึก", "Save")} />
      </section>
    </div>
  );
}
