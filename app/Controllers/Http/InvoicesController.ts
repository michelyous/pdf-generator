import type { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { schema, rules } from "@ioc:Adonis/Core/Validator";
import Route from "@ioc:Adonis/Core/Route";
import Event from "@ioc:Adonis/Core/Event";
import User from "App/Models/User";

export default class InvoicesController {
  public async send({ request, response, auth }: HttpContextContract) {
    // create validation schema. recipient[name] will result in an object being posted
    const _schema = schema.create({
      recipient: schema.object().members({
        name: schema.string({ trim: true }),
        email: schema.string({ trim: true }, [rules.email()]),
      }),
    });
    // get the validated data
    const data = await request.validate({ schema: _schema });
    const params = { uid: auth.user!.id };
    const options = { expiresIn: "3m", qs: data };
    const path = Route.makeSignedUrl("pdf.invoice", params, options);

    Event.emit("send:invoice", {
      user: auth.user,
      recipient: data.recipient,
      signedInvoicePath: path,
    });
    // for now, let's just redirect back to the welcome page
    return response.redirect().toRoute("home");
  }

  public async generate({
    request,
    response,
    view,
    params,
  }: HttpContextContract) {
    if (!request.hasValidSignature()) {
      return response.badRequest("The route signature is invalid");
    }
    const recipient = request.qs().recipient;
    const user = await User.findOrFail(params.uid);
    return view.render("invoice", { user, recipient });
  }
}
