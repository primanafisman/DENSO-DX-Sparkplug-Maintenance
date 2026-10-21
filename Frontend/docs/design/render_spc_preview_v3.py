"""Author a new, deterministic design illustration from a synthetic fixture.

No image is loaded/edited and no application/backend code is imported.
Requires matplotlib; outputs a PNG and an editable SVG beside the design previews.
"""
import json
import math
import statistics
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle
from matplotlib.ticker import FuncFormatter

ROOT = Path(__file__).resolve().parent
fixture = json.loads((ROOT / 'spc-demo-fixture-v3.json').read_text(encoding='utf-8'))
rows = fixture['observations']
means = [statistics.mean(row) for row in rows]
ranges = [max(row) - min(row) for row in rows]
flat = [x for row in rows for x in row]
stats = fixture['statistics']
assert len(rows) == 7 and all(len(row) == 4 for row in rows)
assert math.isclose(statistics.mean(flat), stats['grand_mean'])
assert math.isclose(statistics.stdev(flat), stats['s_overall'])
assert math.isclose(statistics.mean(ranges), stats['rbar'])
assert math.isclose(stats['ucl_r'], fixture['constants']['D4'] * stats['rbar'])
assert math.isclose(stats['cp_paper_s'], (.2)/(6*stats['s_overall']))

RED, INK, MUTED = '#E60012', '#17212F', '#64748B'
BORDER, CANVAS, BLUE = '#E2E8F0', '#F5F6F8', '#557895'
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 9,
                     'text.color': INK, 'axes.labelcolor': MUTED,
                     'xtick.color': MUTED, 'ytick.color': MUTED,
                     'svg.fonttype': 'none'})
fig = plt.figure(figsize=(14.48, 10.86), dpi=160, facecolor=CANVAS)

def text(x, y, value, size=10, color=INK, weight='normal', **kw):
    return fig.text(x, y, value, fontsize=size, color=color, weight=weight,
                    va='center', **kw)

def box(x, y, w, h, fill='white', edge=BORDER, radius=.006):
    p = FancyBboxPatch((x,y),w,h,boxstyle=f'round,pad=0,rounding_size={radius}',
                       facecolor=fill,edgecolor=edge,linewidth=.8,
                       transform=fig.transFigure,zorder=-1)
    fig.patches.append(p)
    return p

# Application chrome is newly drawn; no generated-image pixels are reused.
fig.patches.append(Rectangle((0,0),.17,1,transform=fig.transFigure,
                             facecolor='white',edgecolor=BORDER,zorder=-2))
text(.025,.965,'DENSO',21,RED,'bold',style='italic')
text(.025,.932,'Sparkplug Maintenance',9.7,weight='bold')
for index,label in enumerate(['Ringkasan','Pemeriksaan','Riwayat','Peralatan','Pengaturan']):
    y=.874-index*.057
    if label=='Riwayat':
        box(.006,y-.020,.157,.043,'#FFF0F2','none')
        fig.patches.append(Rectangle((0,y-.020),.004,.043,
                           transform=fig.transFigure,color=RED,zorder=1))
    text(.030,y,label,10.5,RED if label=='Riwayat' else MUTED,
         'bold' if label=='Riwayat' else 'normal')
text(.025,.035,'CV lokal  |  Siap',9,MUTED)
text(.19,.973,'Home  >  Riwayat  >  Detail pengecekan',8.5,MUTED)
text(.968,.973,'Preview | Data contoh',8.5,MUTED,ha='right')
text(.19,.926,'EE Cutting · Laporan pengukuran',20,weight='bold')
box(.855,.905,.125,.035,edge=RED)
text(.9175,.9225,'Cetak laporan',9,RED,ha='center')

filters=[(.19,.12,'EE Cutting'),(.322,.18,'1–7 Okt 2026'),
         (.514,.10,'Line 17'),(.626,.105,'U-Type')]
for x,w,label in filters:
    box(x,.852,w,.038)
    text(x+.012,.871,label,9.2)
for x,w,label,selected in [(.745,.077,'1 minggu',True),(.832,.070,'1 bulan',False),(.912,.068,'Kustom',False)]:
    box(x,.852,w,.038,RED if selected else 'white',RED if selected else BORDER)
    text(x+w/2,.871,label,9,'white' if selected else INK,ha='center')
box(.19,.798,.79,.038)
text(.202,.817,'EE-001 · EE Cutting 1 · 0.01 mm · Shift 1 | Standar 4.40–4.60 mm | n=4 · 7 subgrup · 28 nilai',8.2,MUTED)
box(.801,.805,.169,.024,'#FFF3CD','none')
text(.8855,.817,'Estimasi awal · metode lembar STDEV.S',7.2,'#92400E',ha='center')

box(.19,.550,.565,.225)
box(.19,.312,.565,.224)
box(.767,.312,.213,.463)
text(.202,.753,r'Grafik $\bar{X}$ (mm)',12,weight='bold')
text(.202,.514,'Grafik R (mm)',12,weight='bold')

def chart(rect, data, lower, center, upper, ylabel_format, ylim, labels):
    ax=fig.add_axes(rect,facecolor='white')
    ax.set_xlim(.75,8.0)
    ax.set_ylim(*ylim)
    ax.set_xticks(range(1,8))
    ax.grid(True,color='#EDF1F5',linewidth=.6)
    for side in ['top','right']: ax.spines[side].set_visible(False)
    for side in ['left','bottom']: ax.spines[side].set_color('#CBD5E1')
    ax.tick_params(labelsize=8,length=2)
    ax.plot(range(1,8),data,color=BLUE,marker='o',markersize=4,linewidth=1.5,zorder=3)
    ax.axhline(upper,color=RED,linestyle='--',linewidth=.9)
    ax.axhline(center,color='#94A3B8',linestyle='--',linewidth=.9)
    ax.axhline(lower,color=RED,linestyle='--',linewidth=.9)
    for x,y in enumerate(data,1):
        ax.annotate(f'{y:.3f}',(x,y),xytext=(0,7),textcoords='offset points',
                    ha='center',fontsize=7.3,color=INK)
    span=ylim[1]-ylim[0]
    for y,label,color in [(upper,labels[0],RED),(center,labels[1],MUTED),(lower,labels[2],RED)]:
        ax.text(7.94,y+span*.025,label,ha='right',va='bottom',fontsize=7.4,color=color,
                bbox={'facecolor':'white','edgecolor':'none','pad':.3})
    ax.set_xlabel('Tanggal (Oktober 2026)',fontsize=7.5,labelpad=3)
    ax.yaxis.set_major_formatter(FuncFormatter(lambda val,pos:ylabel_format.format(val)))
    return ax

chart([.232,.596,.502,.140],means,stats['lcl_x'],stats['grand_mean'],stats['ucl_x'],
      '{:.2f}',(4.478,4.522),
      [f"UCLx {stats['ucl_x']:.4f}",rf"$\bar{{\bar{{X}}}}$ {stats['grand_mean']:.4f}",f"LCLx {stats['lcl_x']:.4f}"])
chart([.232,.358,.502,.140],ranges,stats['lcl_r'],stats['rbar'],stats['ucl_r'],
      '{:.2f}',(-.003,.065),
      [f"UCLr {stats['ucl_r']:.5f}",rf"$\bar{{R}}$ {stats['rbar']:.5f}",f"LCLr {stats['lcl_r']:.0f}"])

text(.780,.751,'Perhitungan periode',11.2,weight='bold')
metric_rows=[('Σx','sum_x',4),(r'$\sum \bar{X}$','sum_xbar',4),('ΣR','sum_r',4),
             (r'$\bar{\bar{X}}$','grand_mean',4),(r'$\bar{R}$','rbar',5),('s (overall)','s_overall',5),
             ('σ within','sigma_within',5),('3s','3s',5),('6s','6s',5),('Cp (lembar)','cp_paper_s',3),
             ('Cpk (lembar)','cpk_paper_s',3),('UCLx','ucl_x',4),('LCLx','lcl_x',4),
             ('UCLr','ucl_r',5),('LCLr','lcl_r',0),('R maks','r_max',4)]
for i,(label,key,digits) in enumerate(metric_rows):
    y=.716-i*.0237
    if key in ['cp_paper_s','cpk_paper_s']: box(.777,y-.011,.193,.023,'#FFF0F2','none',.002)
    text(.783,y,label,8.3,weight='bold' if key in ['cp_paper_s','cpk_paper_s'] else 'normal')
    text(.964,y,f'{stats[key]:.{digits}f}',8.8,ha='right',
         weight='bold' if key in ['cp_paper_s','cpk_paper_s'] else 'normal')

box(.19,.042,.79,.254)
text(.202,.275,'Data pengukuran dan Type',11.5,weight='bold')
table_rows=[['Shift / Jam']+['1 · 07:45']*7]
table_rows.extend([[f'X{j+1}']+[f'{row[j]:.2f}' for row in rows] for j in range(4)])
table_rows.extend([[r'$\bar{X}$']+[f'{v:.3f}' for v in means],
                   ['R']+[f'{v:.3f}' for v in ranges],['Type']+['U-Type']*7])
table_ax=fig.add_axes([.201,.061,.768,.192])
table_ax.axis('off')
table=table_ax.table(cellText=table_rows,colLabels=['Parameter']+[f'{i:02d}/10' for i in range(1,8)],
                    cellLoc='center',loc='center',bbox=[0,0,1,1],colWidths=[.11]+[.89/7]*7)
table.auto_set_font_size(False)
table.set_fontsize(8.1)
for (r,c),cell in table.get_celld().items():
    cell.set_edgecolor(BORDER)
    cell.set_linewidth(.45)
    cell.set_facecolor('#F0F4F8' if r==0 else ('#EEF3F7' if r==6 else 'white'))
    if r==0 or c==0: cell.get_text().set_weight('bold')
text(.19,.022,'Contoh terhitung · data ilustrasi. Batas kontrol periode ini belum menjadi baseline yang disahkan.',7.8,MUTED)

out=ROOT/'previews'
out.mkdir(exist_ok=True)
png=out/'history-spc-detail-v3.png'
svg=out/'history-spc-detail-v3.svg'
fig.savefig(png,dpi=160,facecolor=fig.get_facecolor())
fig.savefig(svg,facecolor=fig.get_facecolor())
plt.close(fig)
print(json.dumps({'png':str(png),'svg':str(svg),'statistics':stats,'source':'synthetic fixture only'},indent=2))
