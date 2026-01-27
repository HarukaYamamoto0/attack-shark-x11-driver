button settings - para alterar o comportamento das teclas e configurar as duas teclas extras.

macro manager - bem descritivo, sinceramento eu nem uso isso.

profile - onde diz qual perfil atual, permite criar mais ou deletar, importar exportar etc.

power - mostra o status da bateria do mouse.

reset profile - um botão que reseta o profile atual.

DPI settings - para poder selecionar e configurar os stages de dpi permitindo configurar a vontante.

Light settings - permite configurar uma ledzinha que tem no mouse, mas no meu ele não está respondo direito.

Polling rate settings - configurar polling rate que ja vem pre-setado essas 4 opções.

Mouse atribute - para abrir a janela de config do mouse no windows.

Power manager - dois slider que permite configurar o tempo de sleep com um step de 50 segundos com maximo de 30 min & e deep sleep com um step de 1 minuto com maximo de 60 min.

Key response time - um slider com um minimo de 4ms com step de 2 e maximo de 50ms.

Ripple control - apenas on e off angle snap - apenas on e off.

---

### Criar regra udev

Cria o arquivo:

```bash
sudo nano /etc/udev/rules.d/99-attack-shark-x11.rules
```

Conteúdo:

```udev
SUBSYSTEM=="usb", ATTR{idVendor}=="1d57", ATTR{idProduct}=="fa60", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTR{idVendor}=="1d57", ATTR{idProduct}=="fa55", MODE="0666", GROUP="plugdev"
```

> `0666` = leitura + escrita para user
> `plugdev` é padrão em distros desktop (Mint incluso)


### Aplicar regras

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

Ou mais rápido:

```bash
sudo reboot
```