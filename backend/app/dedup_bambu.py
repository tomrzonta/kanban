"""Corrige a duplicação de fabricante Bambu criada pela migração 0023.

O que faz:
  1. Identifica o fabricante Bambu "original" (o que tem mais modelos com preço)
     e o(s) duplicado(s) (mesmo nome ignorando espaços/maiúsculas).
  2. Para cada modelo do duplicado:
       - se existir um modelo de mesmo nome (normalizado) no original, transfere
         o checklist do duplicado para o real e descarta o modelo duplicado;
       - se não existir, MOVE o modelo para o fabricante original (vira real).
  3. Remove o fabricante duplicado (agora sem modelos).

Como rodar (com os containers no ar):
    docker compose exec backend python -m app.dedup_bambu

É seguro rodar mais de uma vez. Pede confirmação antes.
"""
from sqlalchemy import text

from app.core.database import engine


def _norm(s):
    return "".join((s or "").lower().split())  # remove espaços e baixa caixa


def run():
    with engine.begin() as conn:
        # Todos os fabricantes cujo nome normalizado é "bambulab".
        marcas = conn.execute(text(
            "SELECT id, name FROM printer_brands")).mappings().all()
        bambus = [m for m in marcas if _norm(m["name"]) == "bambulab"]
        if len(bambus) < 2:
            print("Não há fabricante Bambu duplicado. Nada a fazer.")
            return

        # Original = o que tem mais modelos com preço > 0 (dados reais).
        def score(bid):
            return conn.execute(text(
                "SELECT COUNT(*) FROM printer_models "
                "WHERE brand_id=:b AND current_price > 0"), {"b": bid}).first()[0]
        bambus_sorted = sorted(bambus, key=lambda m: score(m["id"]), reverse=True)
        original = bambus_sorted[0]
        duplicados = bambus_sorted[1:]
        print(f"Fabricante mantido: \"{original['name']}\" (id {original['id']}).")
        print(f"Duplicado(s) a remover: {[d['name'] for d in duplicados]}")
        resp = input("Confirmar limpeza? Digite 'CORRIGIR': ").strip()
        if resp != "CORRIGIR":
            print("Cancelado.")
            return

        # Modelos reais do original, indexados por nome normalizado.
        reais = conn.execute(text(
            "SELECT id, name FROM printer_models WHERE brand_id=:b"),
            {"b": original["id"]}).mappings().all()
        idx_real = {_norm(r["name"]): r["id"] for r in reais}

        for dup in duplicados:
            modelos_dup = conn.execute(text(
                "SELECT id, name FROM printer_models WHERE brand_id=:b"),
                {"b": dup["id"]}).mappings().all()
            for md in modelos_dup:
                alvo = idx_real.get(_norm(md["name"]))
                if alvo:
                    # Já existe modelo real equivalente: transfere o checklist
                    # (só o que o real ainda não tem) e apaga o modelo duplicado.
                    tem = conn.execute(text(
                        "SELECT COUNT(*) FROM modelo_checklist WHERE modelo_id=:m"),
                        {"m": alvo}).first()[0]
                    if not tem:
                        conn.execute(text(
                            "UPDATE modelo_checklist SET modelo_id=:alvo "
                            "WHERE modelo_id=:dup"), {"alvo": alvo, "dup": md["id"]})
                    else:
                        conn.execute(text(
                            "DELETE FROM modelo_checklist WHERE modelo_id=:dup"),
                            {"dup": md["id"]})
                    conn.execute(text("DELETE FROM printer_models WHERE id=:m"),
                                 {"m": md["id"]})
                    print(f"  Fundido: \"{md['name']}\" -> modelo real existente.")
                else:
                    # Não há equivalente: move o modelo para o fabricante original.
                    conn.execute(text(
                        "UPDATE printer_models SET brand_id=:orig WHERE id=:m"),
                        {"orig": original["id"], "m": md["id"]})
                    idx_real[_norm(md["name"])] = md["id"]
                    print(f"  Movido para o original: \"{md['name']}\".")
            # Remove o fabricante duplicado (já sem modelos).
            conn.execute(text("DELETE FROM printer_brands WHERE id=:b"), {"b": dup["id"]})
            print(f"  Removido fabricante duplicado \"{dup['name']}\".")

    print("\nPronto. Duplicação corrigida. Ajuste nomes/checklists na tela se quiser.")


if __name__ == "__main__":
    run()
